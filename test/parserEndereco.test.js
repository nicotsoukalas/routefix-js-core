import test from "node:test";
import assert from "node:assert/strict";
import { parseAddress, expandirAbreviacoes } from "../src/parserEndereco.js";
import { normalizeZip, numericKey, buildGroupKey } from "../src/normalizacao.js";

test("expande abreviação sem alterar palavra maior", () => {
  assert.equal(expandirAbreviacoes("R Inhambú"), "rua Inhambú");
  assert.equal(expandirAbreviacoes("Rodrigues"), "Rodrigues");
});

test("separa rua, número e complemento", () => {
  assert.deepEqual(parseAddress("Rua X, 100, Apto 11"), ["Rua X", "100", "Apto 11"]);
});

test("extrai número embutido", () => {
  assert.deepEqual(parseAddress("R Inhambú 553"), ["R Inhambú", "553", ""]);
});

test("normaliza CEP e número", () => {
  assert.equal(normalizeZip("09090-000"), "09090000");
  assert.equal(numericKey("000100a"), "100A");
});

test("gera chave de agrupamento", () => {
  assert.deepEqual(buildGroupKey("Avenida São João", "000100"), ["avenida sao joao", "100"]);
});
