import { ABREVIACOES, COMP_KEYWORDS, SN_PATTERN } from "./constants.js";
import { stripAccents } from "./normalizacao.js";

export function expandirAbreviacoes(texto) {
  if (!texto) return "";
  return String(texto).split(/\s+/).map(token => {
    const key = stripAccents(token).toLowerCase();
    return ABREVIACOES[key] ?? token;
  }).join(" ");
}

export function titleStreet(name) {
  const lowercaseWords = new Set(["de", "da", "do", "das", "dos", "e", "a", "o", "as", "os"]);
  return String(name ?? "").split(/\s+/).filter(Boolean).map((word, i) => {
    if (i === 0) return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    return lowercaseWords.has(word.toLowerCase())
      ? word.toLowerCase()
      : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(" ");
}

export function parseAddress(raw) {
  if (raw === null || raw === undefined || raw === "") return ["", "", ""];

  const text = String(raw).trim();
  const parts = text.split(",").map(p => p.trim());
  let streetRaw = parts[0] ?? "";
  let numberRaw = parts.length >= 2 ? parts[1] : "";
  let complement = parts.length > 2 ? parts.slice(2).join(", ").trim() : "";

  const compMatch = streetRaw.match(COMP_KEYWORDS);
  if (compMatch) {
    const extra = compMatch[0].trim();
    streetRaw = streetRaw.slice(0, compMatch.index).trim();
    complement = complement ? `${extra}, ${complement}` : extra;
  }

  const numInStreet = streetRaw.match(/^(.*\D)\s+(\d{1,5}[A-Za-z]?)\s*$/);
  if (numInStreet) {
    const candidateStreet = numInStreet[1].trim();
    const candidateNum = numInStreet[2].trim();
    if (numberRaw) {
      const nField = numberRaw.split(/\s+/)[0].replace(/\D/g, "");
      const nStreet = candidateNum.replace(/\D/g, "");
      streetRaw = candidateStreet;
      if (nStreet === nField) {
        // Número no endereço é o mesmo do campo; apenas removemos o número da rua.
      } else {
        complement = complement ? `${numberRaw}, ${complement}` : numberRaw;
        numberRaw = candidateNum;
      }
    } else {
      streetRaw = candidateStreet;
      numberRaw = candidateNum;
    }
  }

  if (SN_PATTERN.test(numberRaw)) {
    numberRaw = "S/N";
  } else if (numberRaw && numberRaw !== "S/N") {
    numberRaw = numberRaw.replace(/^(\d+)\s+([A-Za-z])$/, "$1$2").toUpperCase();
  }

  return [streetRaw.trim(), numberRaw, complement];
}
