import test from "node:test";
import assert from "node:assert/strict";
import {
  tokenSortRatio,
  ruasSemelhantes,
  buscarCeps,
  enriquecerRuas,
} from "../src/modules/viacepService.js";

test("tokenSortRatio: mesma frase em ordem diferente", () => {
  assert.equal(tokenSortRatio("Rua João da Silva", "Silva Rua João da"), 100);
});

test("ruas semelhantes: aceita nome equivalente após abreviação", () => {
  const [bate, motivo] = ruasSemelhantes("Av. Paulista", "Avenida Paulista");
  assert.equal(bate, true);
  assert.equal(motivo, "normal");
});

test("ruas semelhantes: fallback de iniciais posicionais", () => {
  const [bate, motivo] = ruasSemelhantes("Rua J da S", "Rua João da Silva");
  assert.equal(bate, true);
  assert.equal(motivo, "iniciais");
});

test("ruas semelhantes: não aceita crédito parcial de iniciais", () => {
  const [bate, motivo] = ruasSemelhantes("Rua J X S", "Rua João da Silva");
  assert.equal(bate, false);
  assert.equal(motivo, "nenhum");
});

test("ruas semelhantes: sem dados", () => {
  assert.deepEqual(ruasSemelhantes("", "Rua A"), [false, "sem_dado"]);
});

test("buscarCeps: consulta CEPs únicos e respeita o resultado", async () => {
  const chamadas = [];
  const fakeFetch = async (url) => {
    chamadas.push(url);
    const cep = url.match(/ws\/(\d+)\/json/)[1];
    return {
      ok: true,
      async json() {
        return { logradouro: cep === "01001000" ? "Rua Direita" : "Rua Central" };
      },
    };
  };

  const resultado = await buscarCeps(
    ["01001000", "01001000", "02002000"],
    { fetchImpl: fakeFetch, threads: 2 },
  );

  assert.equal(chamadas.length, 2);
  assert.equal(resultado.get("01001000"), "Rua Direita");
  assert.equal(resultado.get("02002000"), "Rua Central");
});

test("enriquecerRuas: usa ViaCEP quando a rua é compatível", () => {
  const parsed = [
    { seq: 1, street: "Av. Paulista", zip_norm: "01311000" },
    { seq: 2, street: "Rua X", zip_norm: "00000000" },
  ];

  const resumo = enriquecerRuas(parsed, new Map([
    ["01311000", "Avenida Paulista"],
  ]));

  assert.equal(parsed[0].street, "Avenida Paulista");
  assert.equal(parsed[1].street, "Rua X");
  assert.equal(resumo.alteradas, 1);
  assert.equal(resumo.semCep, 1);
});
