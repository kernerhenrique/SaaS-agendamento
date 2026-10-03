import { normalizePhoneBR } from "@/lib/phone";

/**
 * Importar clientes de planilha (CSV). Função pura: lê o texto, reconhece as
 * colunas e valida linha a linha; quem grava é `importClients`. Aceita o CSV
 * do Excel em português (separado por ";") e o do Google Planilhas (",").
 *
 * Colunas (cabeçalho na 1ª linha, em qualquer ordem, maiúsculas/acentos tanto faz):
 *   nome (obrigatório) · telefone (obrigatório, com DDD) · email · observacoes · tags
 */

export const IMPORT_MAX_ROWS = 2000;

export interface ImportRow {
  line: number;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  tags: string[];
}

export interface ImportProblem {
  line: number;
  message: string;
}

export interface ParsedImport {
  rows: ImportRow[];
  errors: ImportProblem[];
  /** Linhas com telefone repetido no próprio arquivo (fica a primeira). */
  duplicatesInFile: ImportProblem[];
}

type Column = "name" | "phone" | "email" | "notes" | "tags";

const HEADER_ALIASES: Record<string, Column> = {
  nome: "name",
  name: "name",
  cliente: "name",
  telefone: "phone",
  whatsapp: "phone",
  celular: "phone",
  fone: "phone",
  phone: "phone",
  email: "email",
  "e-mail": "email",
  observacoes: "notes",
  observacao: "notes",
  obs: "notes",
  notas: "notes",
  anotacoes: "notes",
  tags: "tags",
  etiquetas: "tags",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "");
}

/** Separador do arquivo: o que mais aparece fora de aspas na 1ª linha (";" do Excel pt-BR ou ","). */
function detectDelimiter(firstLine: string): ";" | "," {
  let semicolons = 0;
  let commas = 0;
  let quoted = false;
  for (const char of firstLine) {
    if (char === '"') quoted = !quoted;
    else if (!quoted && char === ";") semicolons++;
    else if (!quoted && char === ",") commas++;
  }
  return semicolons >= commas && semicolons > 0 ? ";" : ",";
}

/** CSV → linhas de células. Trata aspas ("a; b"), aspas duplicadas ("") e quebra de linha dentro de aspas. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const firstLineEnd = clean.search(/\r?\n/);
  const delimiter = detectDelimiter(firstLineEnd === -1 ? clean : clean.slice(0, firstLineEnd));
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (quoted) {
      if (char === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((value) => value.trim() !== ""));
}

/** Telefone brasileiro → só dígitos com DDD (10 ou 11), sem o 55 do país. */
export function normalizeImportPhone(value: string): string | null {
  const digits = normalizePhoneBR(value);
  const national = digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits;
  return national.length === 10 || national.length === 11 ? national : null;
}

export function parseClientImport(text: string): ParsedImport {
  const [header, ...body] = parseCsv(text);
  if (!header) return { rows: [], errors: [{ line: 1, message: "Arquivo vazio" }], duplicatesInFile: [] };

  const columns = header.map((cell) => HEADER_ALIASES[normalizeHeader(cell)] ?? null);
  const missing = (["name", "phone"] as const).filter((column) => !columns.includes(column));
  if (missing.length > 0) {
    const names = missing.map((column) => (column === "name" ? "nome" : "telefone")).join(" e ");
    return {
      rows: [],
      errors: [{ line: 1, message: `A primeira linha precisa ter a coluna ${names} (use o modelo para baixar)` }],
      duplicatesInFile: [],
    };
  }
  if (body.length > IMPORT_MAX_ROWS) {
    return { rows: [], errors: [{ line: 1, message: `No máximo ${IMPORT_MAX_ROWS} clientes por arquivo; divida a planilha` }], duplicatesInFile: [] };
  }

  const rows: ImportRow[] = [];
  const errors: ImportProblem[] = [];
  const duplicatesInFile: ImportProblem[] = [];
  const seenPhones = new Map<string, number>();

  body.forEach((cells, index) => {
    const line = index + 2;
    const value = (column: Column) => {
      const position = columns.indexOf(column);
      return position === -1 ? "" : (cells[position] ?? "").trim();
    };
    const name = value("name");
    const phone = normalizeImportPhone(value("phone"));
    const email = value("email").toLowerCase();

    if (!name) return errors.push({ line, message: "sem nome" });
    if (name.length > 80) return errors.push({ line, message: "nome com mais de 80 caracteres" });
    if (!phone) return errors.push({ line, message: `telefone "${value("phone")}" sem DDD ou incompleto (ex.: 11 99999-0000)` });
    if (email && !EMAIL_PATTERN.test(email)) return errors.push({ line, message: `e-mail "${email}" inválido` });
    const firstLine = seenPhones.get(phone);
    if (firstLine) return duplicatesInFile.push({ line, message: `mesmo telefone da linha ${firstLine}` });
    seenPhones.set(phone, line);

    rows.push({
      line,
      name,
      phone,
      email: email || null,
      notes: value("notes").slice(0, 2000) || null,
      tags: [...new Set(value("tags").split(/[,|]/).map((tag) => tag.trim()).filter(Boolean))].slice(0, 10),
    });
  });

  return { rows, errors, duplicatesInFile };
}

/** Modelo para baixar: cabeçalho e dois exemplos, no formato do Excel em português (";" e BOM para acentos). */
export const IMPORT_TEMPLATE_CSV =
  "﻿nome;telefone;email;observacoes;tags\r\n" +
  "Maria Silva;(11) 99999-0000;maria@email.com;Prefere horário da manhã;Fiel, VIP\r\n" +
  "João Souza;21 98888-7777;;Alergia a lâmina descartável;\r\n";
