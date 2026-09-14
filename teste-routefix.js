import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { executar } from "./src/modules/pipeline.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROMANEIO_DIR = path.join(__dirname, "Romaneio");
const RESULTADOS_DIR = path.join(__dirname, "Resultados_JS");

async function main() {
  console.log("========================================");
  console.log("       TESTE REAL - ROUTEFIX JS");
  console.log("========================================");
  console.log();

  if (!fs.existsSync(ROMANEIO_DIR)) {
    console.error(`Pasta não encontrada: ${ROMANEIO_DIR}`);
    process.exitCode = 1;
    return;
  }

  fs.mkdirSync(RESULTADOS_DIR, { recursive: true });

  const arquivos = fs
    .readdirSync(ROMANEIO_DIR)
    .filter((nome) => /\.(xlsx|xls)$/i.test(nome))
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  if (arquivos.length === 0) {
    console.log(
      "Nenhuma planilha .xlsx ou .xls encontrada na pasta Romaneio."
    );
    return;
  }

  console.log(`Planilhas encontradas: ${arquivos.length}`);
  console.log();

  let sucessos = 0;
  let erros = 0;

  for (let i = 0; i < arquivos.length; i++) {
    const nomeArquivo = arquivos[i];
    const caminhoEntrada = path.join(ROMANEIO_DIR, nomeArquivo);

    console.log("----------------------------------------");
    console.log(`[${i + 1}/${arquivos.length}] ${nomeArquivo}`);

    try {
      const input = fs.readFileSync(caminhoEntrada);

      const resultado = await executar(input, {
        onProgress: (etapa, progresso) => {
          const porcentagem =
            typeof progresso === "number"
              ? ` ${Math.round(progresso * 100)}%`
              : "";

          process.stdout.write(
            `\r  ${etapa}${porcentagem}          `
          );
        },
      });

      process.stdout.write("\r");

      const base = path.basename(
        nomeArquivo,
        path.extname(nomeArquivo)
      );

      const caminhoSaida = path.join(
        RESULTADOS_DIR,
        `${base}_RouteFix.xlsx`
      );

      fs.writeFileSync(
        caminhoSaida,
        Buffer.from(resultado.arquivoSaida)
      );

      console.log("  ✓ Processado com sucesso");
      console.log(`  Pacotes: ${resultado.pacotes}`);
      console.log(`  Paradas: ${resultado.paradas}`);
      console.log(`  Conflitos: ${resultado.conflitos}`);

      if (resultado.avisos?.length) {
        console.log(`  Avisos: ${resultado.avisos.length}`);
      }

      console.log(
        `  Saída: ${path.relative(__dirname, caminhoSaida)}`
      );

      sucessos++;
    } catch (erro) {
      process.stdout.write("\r");

      console.error("  ✗ ERRO");
      console.error(`  ${erro?.stack || erro}`);

      erros++;
    }
  }

  console.log();
  console.log("========================================");
  console.log("              RESUMO");
  console.log("========================================");
  console.log(`Total:    ${arquivos.length}`);
  console.log(`Sucesso:  ${sucessos}`);
  console.log(`Erros:    ${erros}`);
  console.log();
  console.log(`Resultados: ${RESULTADOS_DIR}`);
  console.log("========================================");

  if (erros > 0) {
    process.exitCode = 1;
  }
}

main().catch((erro) => {
  console.error(erro?.stack || erro);
  process.exitCode = 1;
});