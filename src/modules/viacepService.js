/**
 * Integração com o ViaCEP.
 *
 * Mantém a regra do RouteFix original:
 * 1. consulta CEPs únicos em paralelo;
 * 2. compara o logradouro retornado com a rua original;
 * 3. aceita o ViaCEP quando a similaridade é suficiente;
 * 4. usa fallback de iniciais posicionais;
 * 5. mantém a rua original quando não há retorno ou a similaridade é baixa.
 */

import {
  SIMILARIDADE_MINIMA,
  VIACEP_THREADS,
  VIACEP_TIMEOUT,
} from "../constants.js";
import { expandirAbreviacoes, titleStreet } from "../parserEndereco.js";
import { stripAccents } from "../normalizacao.js";

function isAlpha(value) {
  return /^[A-Za-zÀ-ÖØ-öø-ÿ]$/.test(value);
}

/** Distância de Levenshtein. Usada para calcular uma razão de similaridade. */
export function levenshtein(a, b) {
  const s = String(a ?? "");
  const t = String(b ?? "");

  if (s === t) return 0;
  if (!s.length) return t.length;
  if (!t.length) return s.length;

  // Mantém a linha de cima como a menor para reduzir memória.
  let prev = Array.from({ length: t.length + 1 }, (_, i) => i);
  let curr = new Array(t.length + 1);

  for (let i = 1; i <= s.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost,
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[t.length];
}

/**
 * Similaridade percentual entre duas strings após ordenação dos tokens.
 *
 * Compatível com o comportamento do:
 * Python/RapidFuzz:
 *     fuzz.token_sort_ratio(a, b)
 *
 * O RapidFuzz utiliza uma similaridade baseada em Indel/LCS,
 * e não a distância de Levenshtein tradicional.
 */
export function tokenSortRatio(a, b) {
  const left = String(a ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");

  const right = String(b ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");

  if (left === right) return 100;
  if (!left && !right) return 100;
  if (!left || !right) return 0;

  /*
   * RapidFuzz fuzz.ratio / token_sort_ratio utiliza
   * similaridade baseada em Indel.
   *
   * Para duas strings:
   *
   *     Indel distance = len(A) + len(B) - 2 * LCS
   *
   * Portanto:
   *
   *     similarity =
   *       (len(A) + len(B) - distance)
   *       -------------------------------- × 100
   *       len(A) + len(B)
   *
   * que equivale a:
   *
   *              2 × LCS
   *       ----------------------- × 100
   *          len(A) + len(B)
   */

  const lcsLength = longestCommonSubsequenceLength(
    left,
    right
  );

  return (
    (2 * lcsLength) /
    (left.length + right.length)
  ) * 100;
}

/**
 * Calcula o tamanho da maior subsequência comum (LCS)
 * entre duas strings.
 *
 * Isso reproduz a base utilizada pela similaridade
 * Indel do RapidFuzz.
 */
function longestCommonSubsequenceLength(a, b) {
  const rows = a.length;
  const cols = b.length;

  let previous = new Array(cols + 1).fill(0);
  let current = new Array(cols + 1).fill(0);

  for (let i = 1; i <= rows; i++) {
    current[0] = 0;

    for (let j = 1; j <= cols; j++) {
      if (a[i - 1] === b[j - 1]) {
        current[j] = previous[j - 1] + 1;
      } else {
        current[j] = Math.max(
          previous[j],
          current[j - 1]
        );
      }
    }

    [previous, current] = [current, previous];
  }

  return previous[cols];
}

/**
 * Compara rua original e ViaCEP.
 * Retorna [bate, motivo].
 */
export function ruasSemelhantes(original, viacep) {
  if (!original || !viacep) return [false, "sem_dado"];

  const o = stripAccents(expandirAbreviacoes(original)).toLowerCase().trim();
  const v = stripAccents(expandirAbreviacoes(viacep)).toLowerCase().trim();

  if (tokenSortRatio(o, v) >= SIMILARIDADE_MINIMA) {
    return [true, "normal"];
  }

  const tokensO = o.split(/\s+/).filter(Boolean);
  const tokensV = v.split(/\s+/).filter(Boolean);

  if (tokensO.length !== tokensV.length) return [false, "nenhum"];

  for (let i = 0; i < tokensO.length; i++) {
    const tokO = tokensO[i];
    const tokV = tokensV[i];
    const inicialValida =
      tokO.length === 1 &&
      isAlpha(tokO) &&
      Boolean(tokV) &&
      tokV[0] === tokO;

    if (tokO !== tokV && !inicialValida) {
      return [false, "nenhum"];
    }
  }

  return [true, "iniciais"];
}

/** Consulta um CEP individual. Retorna { cep, logradouro }. */
export async function consultarCep(cep, fetchImpl = globalThis.fetch) {
  const url = `https://viacep.com.br/ws/${cep}/json/`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VIACEP_TIMEOUT);

  try {
    if (typeof fetchImpl !== "function") {
      throw new Error("fetch não está disponível neste ambiente.");
    }

    const response = await fetchImpl(url, {
      signal: controller.signal,
    });

    if (!response.ok) return { cep, logradouro: null };

    const data = await response.json();
    if (data?.erro) return { cep, logradouro: null };

    const logradouro = String(data?.logradouro ?? "").trim();
    return { cep, logradouro: logradouro || null };
  } catch {
    // Igual ao Python: falha de rede não interrompe o processamento.
    return { cep, logradouro: null };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Consulta CEPs com limite de concorrência.
 * Retorna Map { cep => logradouro|null }.
 */
export async function buscarCeps(ceps, options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const concurrency = Math.max(1, options.threads ?? VIACEP_THREADS);
  const uniqueCeps = [...new Set((ceps ?? []).map(String).filter(Boolean))];
  const resultados = new Map();
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= uniqueCeps.length) return;

      const cep = uniqueCeps[index];
      const result = await consultarCep(cep, fetchImpl);
      resultados.set(result.cep, result.logradouro);

      if (typeof options.onProgress === "function") {
        options.onProgress(resultados.size, uniqueCeps.length, result);
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, uniqueCeps.length) },
    () => worker(),
  );
  await Promise.all(workers);

  return resultados;
}

/**
 * Substitui a rua pelo logradouro oficial quando a regra de validação aceita.
 * Modifica os objetos de parsed em lugar, como o Python original.
 */
export function enriquecerRuas(parsed, cacheCep) {
  let alteradas = 0;
  let mantidas = 0;
  let semCep = 0;
  const viaIniciais = [];

  const getCep = (cache, cep) => {
    if (cache instanceof Map) return cache.get(cep);
    return cache?.[cep];
  };

  for (const p of parsed ?? []) {
    const original = p.street ?? "";
    const logradouro = getCep(cacheCep, p.zip_norm);

    if (!logradouro) {
      p.street = titleStreet(original);
      semCep++;
      continue;
    }

    const [bate, motivo] = ruasSemelhantes(original, logradouro);

    if (bate) {
      p.street = titleStreet(logradouro);

      if (stripAccents(original.toLowerCase()) !== stripAccents(logradouro.toLowerCase())) {
        alteradas++;
      }

      if (motivo === "iniciais") {
        viaIniciais.push({
          seq: p.seq,
          original,
          logradouro,
        });
      }
    } else {
      p.street = titleStreet(original);
      mantidas++;
    }
  }

  return {
    alteradas,
    mantidas,
    semCep,
    viaIniciais,
  };
}
