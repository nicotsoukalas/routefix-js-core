import test from "node:test";
import assert from "node:assert/strict";
import { agrupar, atribuirGroupKeys } from "../src/modules/agrupador.js";
import { formatPacotes, montarLinhasSaida, escreverXlsx } from "../src/modules/excelWriter.js";
import * as XLSX from "xlsx";

function sampleParsed() {
  return [
    {
      seq: 2, stop: 2, latitude: -23.5, longitude: -46.6,
      street: "Rua Teste", number: "10", complement: "Apto 2",
      bairro: "Centro", city: "Santo André", zip_orig: "09000-000", zip_norm: "09000000",
      coord_suspeita: false,
    },
    {
      seq: 1, stop: 1, latitude: 0, longitude: 0,
      street: "Rua Teste", number: "10", complement: "Apto 2",
      bairro: "Centro", city: "Santo André", zip_orig: "09000-000", zip_norm: "09000000",
      coord_suspeita: true,
    },
    {
      seq: "-1", stop: "-", latitude: -23.6, longitude: -46.7,
      street: "Rua Outra", number: "20", complement: "",
      bairro: "Centro", city: "Santo André", zip_orig: "09100-000", zip_norm: "09100000",
      coord_suspeita: false,
    },
  ];
}

test("formatPacotes ordena e mostra total", () => {
  assert.equal(formatPacotes([3, 1, 2]), "1, 2, 3; Total: 3 pacotes");
  assert.equal(formatPacotes([7]), "7; Total: 1 pacote");
});

test("montarLinhasSaida escolhe rua mais completa e coordenada válida", () => {
  const parsed = sampleParsed();
  atribuirGroupKeys(parsed);
  const groups = agrupar(parsed);
  const rows = montarLinhasSaida(groups);

  assert.equal(rows.length, 2);
  assert.equal(rows[0]["Address Line 1"], "Rua Teste, 10");
  assert.equal(rows[0]["Address Line 2"], "Apto 2");
  assert.equal(rows[0]["Latitude"], -23.5);
  assert.equal(rows[0]["Longitude"], -46.6);
  assert.equal(rows[0]["Pacotes Na Parada"], "1, 2; Total: 2 pacotes");
  assert.equal(rows[0]["coordenadaSuspeita"], "SIM");
});

test("escreverXlsx gera uma planilha legível pelo SheetJS", () => {
  const rows = montarLinhasSaida(new Map([
    ["a", [{
      seq: 1, stop: 1, latitude: -23, longitude: -46,
      street: "Rua Teste", number: "10", complement: "",
      bairro: "Centro", city: "Santo André", zip_orig: "09000-000",
      coord_suspeita: false,
    }]],
  ]));

  const bytes = escreverXlsx(rows);
  const wb = XLSX.read(bytes, { type: "array" });
  const data = XLSX.utils.sheet_to_json(wb.Sheets.RotaFix);

  assert.equal(data.length, 1);
  assert.equal(data[0]["Parada"], 1);
  assert.equal(data[0]["Address Line 1"], "Rua Teste, 10");
});
