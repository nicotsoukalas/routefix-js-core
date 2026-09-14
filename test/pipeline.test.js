import test from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { executar } from "../src/modules/pipeline.js";

function criarXlsx(rows) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Romaneio");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

test("pipeline executa leitura, ViaCEP, agrupamento e gera XLSX", async () => {
  const input = criarXlsx([
    {
      Sequence: 1,
      "Destination Address": "R. das Flores, 10",
      "Zipcode/Postal code": "09000-001",
      Stop: "1",
      Latitude: -23.65,
      Longitude: -46.53,
      Bairro: "Centro",
      City: "Santo André",
    },
    {
      Sequence: 2,
      "Destination Address": "Rua das Flores, 10",
      "Zipcode/Postal code": "09000-001",
      Stop: "1",
      Latitude: -23.65,
      Longitude: -46.53,
      Bairro: "Centro",
      City: "Santo André",
    },
  ]);

  let calls = 0;
  const result = await executar(input, {
    threads: 2,
    fetchImpl: async (url) => {
      calls += 1;
      assert.match(url, /09000001/);
      return {
        ok: true,
        async json() {
          return { logradouro: "Rua das Flores" };
        },
      };
    },
  });

  assert.equal(calls, 1, "o mesmo CEP deve ser consultado uma única vez");
  assert.equal(result.pacotes, 2);
  assert.equal(result.paradas, 1);
  assert.equal(result.conflitos, 0);
  assert.equal(result.linhasSaida[0]["Address Line 1"], "Rua das Flores, 10");
  assert.equal(result.linhasSaida[0]["Pacotes Na Parada"], "1, 2; Total: 2 pacotes");
  assert.ok(result.arquivoSaida instanceof Uint8Array);
  assert.ok(result.arquivoSaida.byteLength > 0);

  const workbook = XLSX.read(result.arquivoSaida, { type: "array" });
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets["RotaFix"]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].Parada, "1");
});

test("pipeline marca coordenada ausente como suspeita e não interrompe", async () => {
  const input = criarXlsx([
    {
      Sequence: 1,
      "Destination Address": "Rua A, 10",
      "Zipcode/Postal code": "09000-010",
      Stop: "1",
      Latitude: 0,
      Longitude: 0,
    },
  ]);

  const result = await executar(input, {
    fetchImpl: async () => ({
      ok: true,
      async json() { return { logradouro: "Rua A" }; },
    }),
  });

  assert.equal(result.conflitos, 1);
  assert.match(result.avisos[0], /coordenada \(0,0\)/);
  assert.equal(result.linhasSaida[0].coordenadaSuspeita, "SIM");
});
