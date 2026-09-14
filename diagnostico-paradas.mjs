import fs from "fs";
import path from "path";
import XLSX from "xlsx";

const BASE = process.cwd();

const DIR_PYTHON = path.join(BASE, "Resultados_Python");
const DIR_JS = path.join(BASE, "Resultados_JS");

const ARQUIVOS_PROBLEMATICOS = [
  "02-07-2026",
  "06-05-2026",
  "07-05-2026",
];

function localizarArquivo(pasta, data) {
  const arquivos = fs.readdirSync(pasta);

  return arquivos.find((arquivo) => {
    const nome = arquivo.toLowerCase();

    return (
      nome.startsWith(data.toLowerCase() + " ") ||
      nome.startsWith(data.toLowerCase() + ".")
    );
  });
}

function lerParadas(caminho) {
  const workbook = XLSX.readFile(caminho);
  const primeiraAba = workbook.Sheets[workbook.SheetNames[0]];

  const linhas = XLSX.utils.sheet_to_json(primeiraAba, {
    defval: "",
  });

  const paradas = [];

  for (const linha of linhas) {
    const parada = String(linha["Parada"] ?? "").trim();

    const pacotesTexto = String(
      linha["Pacotes Na Parada"] ?? ""
    ).trim();

    if (!parada && !pacotesTexto) continue;

    const antesDoTotal = pacotesTexto.split(";")[0];

    const pacotes = antesDoTotal
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    paradas.push({
      parada,
      pacotes,
      endereco: String(linha["Address Line 1"] ?? "").trim(),
      complemento: String(linha["Address Line 2"] ?? "").trim(),
      cep: String(linha["Postal Code"] ?? "").trim(),
    });
  }

  return paradas;
}

function mapaPacotes(paradas) {
  const mapa = new Map();

  for (const parada of paradas) {
    for (const pacote of parada.pacotes) {
      mapa.set(pacote, parada);
    }
  }

  return mapa;
}

function mesmaParada(a, b) {
  if (!a || !b) return false;

  if (a.pacotes.length !== b.pacotes.length) {
    return false;
  }

  const conjuntoA = new Set(a.pacotes);
  const conjuntoB = new Set(b.pacotes);

  for (const pacote of conjuntoA) {
    if (!conjuntoB.has(pacote)) {
      return false;
    }
  }

  return true;
}

function formatarParada(parada) {
  if (!parada) {
    return "(não encontrada)";
  }

  return [
    `Parada: ${parada.parada}`,
    `Pacotes: ${parada.pacotes.join(", ")}`,
    `Endereço: ${parada.endereco}`,
    `Complemento: ${parada.complemento}`,
    `CEP: ${parada.cep}`,
  ].join("\n");
}

function comparar(data) {
  const arquivoPython = localizarArquivo(DIR_PYTHON, data);
  const arquivoJS = localizarArquivo(DIR_JS, data);

  console.log(`\n==================================================`);
  console.log(`ARQUIVO: ${data}`);
  console.log(`==================================================`);

  if (!arquivoPython) {
    console.log(`❌ Python não encontrado.`);
    return;
  }

  if (!arquivoJS) {
    console.log(`❌ JavaScript não encontrado.`);
    return;
  }

  console.log(`Python: ${arquivoPython}`);
  console.log(`JS:     ${arquivoJS}`);

  const python = lerParadas(
    path.join(DIR_PYTHON, arquivoPython)
  );

  const js = lerParadas(
    path.join(DIR_JS, arquivoJS)
  );

  console.log(`\nPython:     ${python.length} paradas`);
  console.log(`JavaScript: ${js.length} paradas`);

  if (python.length === js.length) {
    console.log("✅ Número de paradas IGUAL");
  } else {
    console.log("❌ Número de paradas DIFERENTE");
  }

  const mapaPython = mapaPacotes(python);
  const mapaJS = mapaPacotes(js);

  const pacotes = [
    ...new Set([
      ...mapaPython.keys(),
      ...mapaJS.keys(),
    ]),
  ];

  const divergencias = [];

  for (const pacote of pacotes) {
    const paradaPython = mapaPython.get(pacote);
    const paradaJS = mapaJS.get(pacote);

    if (!mesmaParada(paradaPython, paradaJS)) {
      divergencias.push({
        pacote,
        python: paradaPython,
        js: paradaJS,
      });
    }
  }

  console.log(
    `\nPacotes com divergência: ${divergencias.length}`
  );

  if (divergencias.length === 0) {
    console.log(
      "✅ Todos os pacotes estão nas mesmas paradas."
    );
    return;
  }

  console.log(
    "\n---------------- PRIMEIRAS DIVERGÊNCIAS ----------------"
  );

  const limite = Math.min(divergencias.length, 20);

  for (let i = 0; i < limite; i++) {
    const item = divergencias[i];

    console.log(`\n### PACOTE ${item.pacote}`);

    console.log("\nPYTHON:");
    console.log(formatarParada(item.python));

    console.log("\nJAVASCRIPT:");
    console.log(formatarParada(item.js));
  }

  console.log(
    "\n=================================================="
  );

  console.log(
    "PROCURANDO PARADAS QUE FORAM DIVIDIDAS"
  );

  console.log(
    "=================================================="
  );

  let encontradas = 0;

  for (const paradaPython of python) {
    if (paradaPython.pacotes.length <= 1) {
      continue;
    }

    const paradasJS = paradaPython.pacotes.map(
      (pacote) => mapaJS.get(pacote)
    );

    const validas = paradasJS.filter(Boolean);

    const numerosJS = new Set(
      validas.map((parada) => parada.parada)
    );

    if (numerosJS.size > 1) {
      encontradas++;

      console.log("\n🔴 PARADA DIVIDIDA");

      console.log("\nPYTHON:");
      console.log(formatarParada(paradaPython));

      console.log("\nJAVASCRIPT:");

      for (const paradaJS of validas) {
        console.log(formatarParada(paradaJS));
        console.log("---");
      }

      if (encontradas >= 10) {
        break;
      }
    }
  }

  if (encontradas === 0) {
    console.log(
      "\nNenhuma parada claramente dividida foi encontrada."
    );
  }
}

console.log(
  "\n=============================================="
);

console.log(
  " ROUTEFIX - DIAGNÓSTICO DE AGRUPAMENTO"
);

console.log(
  "=============================================="
);

for (const arquivo of ARQUIVOS_PROBLEMATICOS) {
  comparar(arquivo);
}

console.log(
  "\n=============================================="
);

console.log(
  " FIM DO DIAGNÓSTICO"
);

console.log(
  "=============================================="
);