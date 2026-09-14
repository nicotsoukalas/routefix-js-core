import { tokenSortRatio } from "./src/modules/viacepService.js";
import { expandirAbreviacoes } from "./src/parserEndereco.js";
import { stripAccents } from "./src/normalizacao.js";

function normalizarParaComparacao(texto) {
  return stripAccents(
    expandirAbreviacoes(texto)
  ).toLowerCase();
}

const casos = [
  {
    cep: "04612-040",
    original: "Av Br do Rego Barros",
    viacep: "Avenida Barão do Rego Barros",
  },
  {
    cep: "04618-020",
    original: "R Álvaro L R de Assumpção",
    viacep: "Rua Álvaro Luís Roberto de Assumpção",
  },
  {
    cep: "04601-003",
    original: "R Prca Isabel",
    viacep: "Rua Princesa Isabel",
  },
  {
    cep: "04563-000",
    original: "Rua Padre Antonio Jose dos Santos",
    viacep: "Avenida Padre Antônio José dos Santos",
  },
];

console.log("");
console.log("==============================================");
console.log(" ROUTEFIX - DIAGNÓSTICO VIACEP");
console.log("==============================================");

for (const caso of casos) {
  const original = normalizarParaComparacao(caso.original);
  const viacep = normalizarParaComparacao(caso.viacep);

  const score = tokenSortRatio(
    caso.original,
    caso.viacep
  );

  const scoreNormalizado = tokenSortRatio(
    original,
    viacep
  );

  console.log("");
  console.log("----------------------------------------------");
  console.log(`CEP: ${caso.cep}`);

  console.log("");
  console.log("ORIGINAL:");
  console.log(`  ${caso.original}`);

  console.log("");
  console.log("VIA CEP:");
  console.log(`  ${caso.viacep}`);

  console.log("");
  console.log("APÓS NORMALIZAÇÃO:");
  console.log(`  Original: ${original}`);
  console.log(`  ViaCEP:   ${viacep}`);

  console.log("");
  console.log("SCORE JS:");
  console.log(`  Original:       ${score}`);
  console.log(`  Normalizado:    ${scoreNormalizado}`);

  console.log("");
  console.log("LIMITE ATUAL:");
  console.log("  SIMILARIDADE_MINIMA = 80");

  console.log("");
  console.log(
    scoreNormalizado >= 80
      ? "  ✅ JS ACEITARIA"
      : "  ❌ JS REJEITARIA"
  );
}

console.log("");
console.log("==============================================");
console.log(" FIM DO DIAGNÓSTICO");
console.log("==============================================");