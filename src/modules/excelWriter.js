/**
 * Monta as linhas finais das paradas e escreve o XLSX.
 * Portado de services/processamento/excel_writer.py.
 */

import * as XLSX from "xlsx";
import { safeStr, numericKey } from "../normalizacao.js";

function isValidCoordinate(value) {
  if (value === null || value === undefined || value === "") return false;
  const n = Number(value);
  return Number.isFinite(n) && n !== 0;
}

export function formatPacotes(seqs = []) {
  const ordered = [...seqs].sort((a, b) => {
    const aString = typeof a === "string";
    const bString = typeof b === "string";
    if (aString !== bString) return aString ? -1 : 1;
    return String(a).localeCompare(String(b), undefined, { numeric: true });
  });

  const parts = ordered.map(String);
  const total = parts.length;
  const palavra = total === 1 ? "pacote" : "pacotes";
  return `${parts.join(", ")}; Total: ${total} ${palavra}`;
}

export function montarLinhasSaida(groups) {
  const outputRows = [];
  const values = groups instanceof Map ? groups.values() : Object.values(groups ?? {});

  for (const members of values) {
    if (!members?.length) continue;

    const street = members.reduce((best, member) =>
      String(member.street ?? "").length > String(best.street ?? "").length ? member : best,
    members[0]).street;

    const number = numericKey(members[0].number);
    const addrL1 = number ? `${street}, ${number}` : street;
    const addrL2 = safeStr(members[0].complement);
    const pacotes = members.map((m) => m.seq);

    const bestStop = members.find(
      (m) => m.stop !== null && m.stop !== undefined && String(m.stop) !== "" && String(m.stop) !== "-",
    )?.stop ?? "-";

    const bestLat = members.find((m) => isValidCoordinate(m.latitude))?.latitude ?? 0;
    const bestLon = members.find((m) => isValidCoordinate(m.longitude))?.longitude ?? 0;
    const coordSus = members.some((m) => Boolean(m.coord_suspeita));

    outputRows.push({
      "Parada": bestStop,
      "Address Line 1": addrL1,
      "Address Line 2": addrL2,
      "Bairro": members[0].bairro ?? "",
      "City": members[0].city ?? "",
      "Latitude": bestLat,
      "Longitude": bestLon,
      "Postal Code": members[0].zip_orig ?? "",
      "Pacotes Na Parada": formatPacotes(pacotes),
      "coordenadaSuspeita": coordSus ? "SIM" : "",
    });
  }

  outputRows.sort((a, b) => {
    const aNum = /^\d+$/.test(String(a.Parada)) ? Number(a.Parada) : 9999;
    const bNum = /^\d+$/.test(String(b.Parada)) ? Number(b.Parada) : 9999;
    return aNum - bNum;
  });

  return outputRows;
}

/**
 * Gera um XLSX em memória.
 * Retorna Uint8Array, adequado para browser/Capacitor.
 */
export function escreverXlsx(outputRows) {
  const worksheet = XLSX.utils.json_to_sheet(outputRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "RotaFix");

  // Captura o ArrayBuffer gerado pela biblioteca
  const rawData = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  // Converte e entrega a visão correta em Uint8Array
  return new Uint8Array(rawData);
}


/**
 * No Node, também permite salvar diretamente em disco.
 * No Android/Capacitor, prefira escreverXlsx() e entregar o Uint8Array
 * para a API nativa de arquivos.
 */
export function escreverArquivo(outputRows, outputPath) {
  const data = XLSX.write(
    (() => {
      const ws = XLSX.utils.json_to_sheet(outputRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "RotaFix");
      return wb;
    })(),
    { bookType: "xlsx", type: "buffer" },
  );

  // Import dinâmico evita carregar fs no navegador.
  return import("node:fs/promises").then((fs) => fs.writeFile(outputPath, data));
}
