import test from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { lerRomaneio } from "../src/modules/excelReader.js";

test("lê e ordena sequências numeradas", () => {
  const ws = XLSX.utils.json_to_sheet([
    { Sequence: 20, "Destination Address": "Rua B, 20", "Zipcode/Postal code": "09000-020", Stop: "2" },
    { Sequence: 10, "Destination Address": "Rua A, 10", "Zipcode/Postal code": "09000-010", Stop: "1" },
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Romaneio");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const result = lerRomaneio(buffer);
  assert.deepEqual(result.map(p => p.seq), [10, 20]);
  assert.equal(result[0].street, "Rua A");
  assert.equal(result[0].number, "10");
});

test("coloca sequências '-' antes das numeradas e cria rótulos únicos", () => {
  const ws = XLSX.utils.json_to_sheet([
    { Sequence: 10, "Destination Address": "Rua A, 10", "Zipcode/Postal code": "09000-010" },
    { Sequence: "-", "Destination Address": "Rua Sem Número, S/N", "Zipcode/Postal code": "09000-020" },
    { Sequence: 20, "Destination Address": "Rua B, 20", "Zipcode/Postal code": "09000-030" },
    { Sequence: "-", "Destination Address": "Rua Outra, S/N", "Zipcode/Postal code": "09000-040" },
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Romaneio");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const result = lerRomaneio(buffer);
  assert.deepEqual(result.map(p => p.seq), ["21 (+1)", "22 (+2)", 10, 20]);
  assert.equal(result[0].number, "S/N");
});

test("normaliza nomes das colunas removendo espaços laterais", () => {
  const ws = XLSX.utils.aoa_to_sheet([
    [" Sequence ", " Destination Address ", " Zipcode/Postal code "],
    [1, "Av. Paulista, 100", "01311-000"],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Romaneio");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const result = lerRomaneio(buffer);
  assert.equal(result.length, 1);
  assert.equal(result[0].zip_norm, "01311000");
});
