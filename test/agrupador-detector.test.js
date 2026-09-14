import test from "node:test";
import assert from "node:assert/strict";
import { atribuirGroupKeys, agrupar } from "../src/modules/agrupador.js";
import { marcarCoordenadasZeradas, detectCoordConflicts } from "../src/modules/detectorConflitos.js";

test("agrupador: mesma rua e número gera a mesma parada", () => {
  const items = [
    { street: "Av. São Paulo", number: "001" },
    { street: "Av. São Paulo", number: "1" },
    { street: "Rua X", number: "2" },
  ];
  atribuirGroupKeys(items);
  const groups = agrupar(items);
  assert.equal(groups.size, 2);
  assert.equal(groups.get(JSON.stringify(items[0].group_key)).length, 2);
});

test("coordenada zerada é marcada como suspeita", () => {
  const items = [{ latitude: 0, longitude: 0 }, { latitude: -23.5, longitude: -46.6 }];
  assert.equal(marcarCoordenadasZeradas(items), 1);
  assert.equal(items[0].coord_suspeita, true);
});

test("coordenadas próximas de ruas diferentes são detectadas", () => {
  const items = [
    { street: "Rua A", number: "10", zip5: "09000000", latitude: -23.5500, longitude: -46.6300 },
    { street: "Rua B", number: "20", zip5: "09000000", latitude: -23.5501, longitude: -46.6300 },
  ];
  const suspects = detectCoordConflicts(items);
  assert.deepEqual([...suspects].sort((a,b)=>a-b), [0, 1]);
});
