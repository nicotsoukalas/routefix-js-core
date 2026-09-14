/** Agrupamento de pacotes por rua + número. Portado de agrupador.py. */
import { buildGroupKey } from "../normalizacao.js";

export function atribuirGroupKeys(parsed) {
  for (const p of parsed) {
    p.group_key = buildGroupKey(p.street, p.number);
  }
}

export function agrupar(parsed) {
  const groups = new Map();
  for (const p of parsed) {
    const key = p.group_key ?? buildGroupKey(p.street, p.number);
    const mapKey = JSON.stringify(key);
    if (!groups.has(mapKey)) groups.set(mapKey, []);
    groups.get(mapKey).push(p);
  }
  return groups;
}
