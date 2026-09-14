/**
 * Leitura do romaneio XLSX de entrada.
 * Mantém a mesma estrutura de dados usada pelo pipeline Python.
 */
import * as XLSX from "xlsx";
import { parseAddress } from "../parserEndereco.js";
import { safeStr, normalizeZip } from "../normalizacao.js";

function isMissing(value) {
  return value === null || value === undefined || (typeof value === "number" && Number.isNaN(value));
}

function toNumeric(value) {
  if (isMissing(value) || String(value).trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function sequenceLabel(value) {
  if (isMissing(value)) return "";
  return String(value).trim();
}

/**
 * Lê o primeiro worksheet de um XLSX e devolve uma lista de pacotes.
 * Aceita caminho de arquivo ou Buffer/Uint8Array.
 */
export function lerRomaneio(input) {
  const isNodeBuffer = typeof Buffer !== "undefined" && Buffer.isBuffer(input);
  const options = { cellDates: false };
  if (isNodeBuffer) options.type = "buffer";
  else if (input instanceof Uint8Array) options.type = "array";
  const workbook = XLSX.read(input, options);
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) throw new Error("A planilha não possui nenhuma aba.");

  const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: null, raw: true });
  const normalizedRows = rows.map(row => {
    const normalized = {};
    for (const [key, value] of Object.entries(row)) normalized[String(key).trim()] = value;
    return normalized;
  });

  const required = ["Sequence", "Destination Address", "Zipcode/Postal code"];
  const missing = required.filter(column => !Object.prototype.hasOwnProperty.call(normalizedRows[0] ?? {}, column));
  if (missing.length) {
    throw new Error(`Coluna(s) obrigatória(s) ausente(s): ${missing.join(", ")}`);
  }

  const seqRaw = normalizedRows.map(row => sequenceLabel(row["Sequence"]));
  const dashMask = seqRaw.map(value => value === "-");
  const nDash = dashMask.filter(Boolean).length;

  const numericSequences = normalizedRows
    .map(row => toNumeric(row["Sequence"]))
    .filter(value => value !== null);
  const maxSeq = numericSequences.length ? Math.trunc(Math.max(...numericSequences)) : 0;

  let counter = 1;
  const labels = normalizedRows.map((_, index) => {
    if (!dashMask[index]) return null;
    const label = `${maxSeq + counter} (+${counter})`;
    counter += 1;
    return label;
  });

  const indexed = normalizedRows.map((row, index) => ({ row, index, numericSequence: toNumeric(row["Sequence"]) }));
  const dashRows = indexed.filter(item => dashMask[item.index]);
  const numericRows = indexed
    .filter(item => !dashMask[item.index] && item.numericSequence !== null)
    .sort((a, b) => a.numericSequence - b.numericSequence);
  const ordered = [...dashRows, ...numericRows];

  return ordered.map(item => {
    const row = item.row;
    const [streetRaw, number, complement] = parseAddress(row["Destination Address"] ?? "");
    const zipNorm = normalizeZip(row["Zipcode/Postal code"]);
    const zip5 = zipNorm ? zipNorm.slice(0, 5) : "";
    const seqLabel = labels[item.index];
    const seqValue = seqLabel ? seqLabel : Math.trunc(item.numericSequence);

    return {
      seq: seqValue,
      stop: safeStr(row["Stop"]),
      latitude: row["Latitude"],
      longitude: row["Longitude"],
      street: streetRaw,
      number,
      complement,
      bairro: safeStr(row["Bairro"]),
      city: safeStr(row["City"]),
      zip_orig: safeStr(row["Zipcode/Postal code"]),
      zip_norm: zipNorm,
      zip5,
      coord_suspeita: false,
    };
  });
}

export function lerRomaneioDeArquivo(caminho) {
  return lerRomaneio(caminho);
}
