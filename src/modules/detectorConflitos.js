/** Detecção de coordenadas suspeitas. Portado de detector_conflitos.py. */
import { COORD_CONFLICT_METERS, COORD_SAME_STREET_DIFF } from "../constants.js";
import { haversineMeters } from "../geografia.js";
import { stripAccents, numericKey } from "../normalizacao.js";

function streetKey(street) {
  let s = stripAccents(String(street ?? "").toLowerCase().trim());
  return s.replace(/\s+/g, " ");
}

function numDigits(n) {
  const match = String(n ?? "").match(/^(\d+)/);
  return match ? Number.parseInt(match[1], 10) : -1;
}

export function marcarCoordenadasZeradas(parsed) {
  let count = 0;
  for (const p of parsed) {
    const lat = Number(p.latitude);
    const lon = Number(p.longitude);
    const invalido = !Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0);
    if (invalido) {
      p.coord_suspeita = true;
      count += 1;
    }
  }
  return count;
}

export function detectCoordConflicts(parsed) {
  const suspectIndices = new Set();
  const valid = [];
  for (let i = 0; i < parsed.length; i += 1) {
    const lat = Number(parsed[i].latitude);
    const lon = Number(parsed[i].longitude);
    if (Number.isFinite(lat) && Number.isFinite(lon) && lat !== 0 && lon !== 0) {
      valid.push([i, lat, lon]);
    }
  }

  const parent = new Map(valid.map(([i]) => [i, i]));
  function find(x) {
    let current = x;
    while (parent.get(current) !== current) {
      parent.set(current, parent.get(parent.get(current)));
      current = parent.get(current);
    }
    return current;
  }
  function union(x, y) { parent.set(find(x), find(y)); }

  const conflictPairs = [];
  for (let a = 0; a < valid.length; a += 1) {
    const [i, latA, lonA] = valid[a];
    for (let b = a + 1; b < valid.length; b += 1) {
      const [j, latB, lonB] = valid[b];
      const dist = haversineMeters(latA, lonA, latB, lonB);
      if (dist > COORD_CONFLICT_METERS) continue;

      const sa = streetKey(parsed[i].street);
      const sb = streetKey(parsed[j].street);
      const na = numericKey(parsed[i].number);
      const nb = numericKey(parsed[j].number);
      const zipA = String(parsed[i].zip5 ?? "");
      const zipB = String(parsed[j].zip5 ?? "");

      const critA = sa !== sb && na !== nb;
      const naInt = numDigits(na);
      const nbInt = numDigits(nb);
      const critB = sa === sb && zipA === zipB && zipA !== "" &&
        naInt >= 0 && nbInt >= 0 && Math.abs(naInt - nbInt) > COORD_SAME_STREET_DIFF;

      if (critA || critB) {
        const reason = critA ? "ruas diferentes" : `mesmo CEP, números distantes (${naInt}↔${nbInt})`;
        conflictPairs.push([i, j, dist, reason]);
        union(i, j);
      }
    }
  }

  const clusters = new Map();
  for (const [i, j] of conflictPairs) {
    const root = find(i);
    if (!clusters.has(root)) clusters.set(root, new Set());
    clusters.get(root).add(i);
    clusters.get(root).add(j);
  }

  for (const indices of clusters.values()) {
    for (const idx of indices) suspectIndices.add(idx);
  }
  return suspectIndices;
}
