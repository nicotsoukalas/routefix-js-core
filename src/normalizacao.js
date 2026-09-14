/** Funções puras de normalização: sem rede, banco ou I/O. */

export function stripAccents(value) {
  const s = String(value ?? "");
  return s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

export function safeStr(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" && Number.isNaN(value)) return "";
  return String(value).trim();
}

export function normalizeZip(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" && Number.isNaN(value)) return "";
  return String(value).replace(/\D/g, "");
}

export function numericKey(number) {
  if (!number || number === "S/N") return number || "";
  const match = String(number).match(/^0*(\d+)([A-Za-z]?)$/);
  if (match) return String(Number(match[1])) + match[2].toUpperCase();
  return String(number);
}

export function buildGroupKey(street, number) {
  let s = stripAccents(String(street ?? "").toLowerCase().trim());
  s = s.replace(/\s+/g, " ");
  return [s, numericKey(number)];
}
