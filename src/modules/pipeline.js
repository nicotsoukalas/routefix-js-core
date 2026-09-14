/**
 * Pipeline principal do RouteFix.
 * Portado de services/processamento/pipeline.py.
 *
 * O pipeline não conhece Android, Flask, banco ou filesystem.
 * Recebe os bytes de um XLSX e devolve os bytes do XLSX processado.
 */

import { lerRomaneio } from "./excelReader.js";
import { buscarCeps, enriquecerRuas } from "./viacepService.js";
import { atribuirGroupKeys, agrupar } from "./agrupador.js";
import {
  marcarCoordenadasZeradas,
  detectCoordConflicts,
} from "./detectorConflitos.js";
import { montarLinhasSaida, escreverXlsx } from "./excelWriter.js";

function validarEntrada(input) {
  if (input === null || input === undefined) {
    throw new TypeError("Arquivo de entrada não fornecido.");
  }

  if (typeof input === "string") {
    if (!input.trim()) throw new TypeError("Caminho do arquivo vazio.");
    return;
  }

  if (input instanceof Uint8Array) {
    if (input.byteLength === 0) throw new TypeError("Arquivo vazio.");
    return;
  }

  if (typeof Buffer !== "undefined" && Buffer.isBuffer(input)) {
    if (input.length === 0) throw new TypeError("Arquivo vazio.");
    return;
  }

  throw new TypeError("Entrada inválida: esperado caminho, Buffer ou Uint8Array.");
}

/**
 * Executa o processamento completo.
 *
 * Retorna:
 * {
 *   arquivoSaida: Uint8Array,
 *   pacotes: number,
 *   paradas: number,
 *   conflitos: number,
 *   avisos: string[],
 *   linhasSaida: object[]
 * }
 */
export async function executar(input, options = {}) {
  validarEntrada(input);

  const onProgress = options.onProgress;
  const progress = (etapa, percentual, detalhe = "") => {
    if (typeof onProgress === "function") {
      onProgress({ etapa, percentual, detalhe });
    }
  };

  progress("leitura", 5, "Lendo a planilha...");
  const parsed = lerRomaneio(input);
  const avisos = [];

  progress("viacep", 15, "Preparando consultas de CEP...");
  const cepsUnicos = [...new Set(
    parsed
      .map((p) => p.zip_norm)
      .filter((cep) => typeof cep === "string" && cep.length === 8),
  )].sort();

  const cacheCep = cepsUnicos.length
    ? await buscarCeps(cepsUnicos, {
        fetchImpl: options.fetchImpl,
        threads: options.threads,
        onProgress: (done, total) => {
          const percentual = 15 + Math.round((done / total) * 25);
          progress("viacep", percentual, `Consultando CEP ${done} de ${total}...`);
        },
      })
    : new Map();

  progress("enriquecimento", 45, "Validando logradouros pelo ViaCEP...");
  enriquecerRuas(parsed, cacheCep);

  progress("agrupamento", 55, "Agrupando pacotes por endereço...");
  atribuirGroupKeys(parsed);

  // Coordenadas zeradas/ausentes são marcadas diretamente.
  try {
    const qtdZeradas = marcarCoordenadasZeradas(parsed);
    if (qtdZeradas) {
      avisos.push(
        `${qtdZeradas} pacote(s) com coordenada (0,0) ou ausente — marcados como suspeitos.`,
      );
    }
  } catch (error) {
    avisos.push(
      `Detecção de coordenadas zeradas falhou: ${error?.message ?? error} — continuando sem marcação.`,
    );
  }

  // Coordenadas válidas são comparadas pelo detector/Union-Find.
  progress("coordenadas", 65, "Verificando coordenadas suspeitas...");
  let suspectIndices = new Set();
  try {
    suspectIndices = detectCoordConflicts(parsed);
  } catch (error) {
    avisos.push(
      `Detecção de coordenadas suspeitas falhou: ${error?.message ?? error} — continuando sem marcação.`,
    );
  }

  for (const index of suspectIndices) {
    parsed[index].coord_suspeita = true;
  }

  progress("saida", 80, "Montando as paradas finais...");
  const groups = agrupar(parsed);
  const outputRows = montarLinhasSaida(groups);

  progress("excel", 95, "Gerando o XLSX final...");
  const arquivoSaida = escreverXlsx(outputRows);

  const totalSuspeitos = parsed.filter((p) => Boolean(p.coord_suspeita)).length;

  progress("concluido", 100, "Processamento concluído.");

  return {
    arquivoSaida,
    pacotes: parsed.length,
    paradas: outputRows.length,
    conflitos: totalSuspeitos,
    avisos,
    linhasSaida: outputRows,
  };
}

export { validarEntrada };
