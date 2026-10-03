import { describe, expect, it } from "vitest";

import {
  IMPORT_TEMPLATE_CSV,
  normalizeImportPhone,
  parseClientImport,
  parseCsv,
} from "@/server/modules/client/client-import";

describe("parseCsv", () => {
  it("Excel em português: ponto e vírgula, BOM e quebra de linha do Windows", () => {
    expect(parseCsv("﻿nome;telefone\r\nAna;11999990000\r\n")).toEqual([
      ["nome", "telefone"],
      ["Ana", "11999990000"],
    ]);
  });

  it("Google Planilhas: vírgula, aspas com separador e aspas duplicadas dentro", () => {
    expect(parseCsv('nome,obs\n"Silva, Ana","disse ""oi"""\n')).toEqual([
      ["nome", "obs"],
      ["Silva, Ana", 'disse "oi"'],
    ]);
  });

  it("ignora linhas em branco", () => {
    expect(parseCsv("a;b\n\n1;2\n;\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("telefone", () => {
  it("aceita máscara e o 55 do país; recusa sem DDD", () => {
    expect(normalizeImportPhone("(11) 99999-0000")).toBe("11999990000");
    expect(normalizeImportPhone("+55 21 3333-4444")).toBe("2133334444");
    expect(normalizeImportPhone("99999-0000")).toBeNull();
  });
});

describe("parseClientImport", () => {
  it("o modelo para baixar é lido sem erro", () => {
    const result = parseClientImport(IMPORT_TEMPLATE_CSV);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({ name: "Maria Silva", phone: "11999990000", email: "maria@email.com", tags: ["Fiel", "VIP"] });
    expect(result.rows[1]).toMatchObject({ name: "João Souza", phone: "21988887777", email: null, notes: "Alergia a lâmina descartável", tags: [] });
  });

  it("cabeçalho com sinônimos, maiúsculas e acentos, em qualquer ordem", () => {
    const result = parseClientImport("WhatsApp;Observações;Nome\n11977776666;VIP;Ana\n");
    expect(result.rows[0]).toMatchObject({ name: "Ana", phone: "11977776666", notes: "VIP" });
  });

  it("aponta a linha de cada erro e os repetidos no próprio arquivo", () => {
    const result = parseClientImport(
      ["nome;telefone;email", ";11999990000;", "Bia;9999;", "Caio;11988887777;caio@", "Dani;11977776666;", "Dani de novo;(11) 97777-6666;"].join("\n"),
    );
    expect(result.rows.map((r) => r.name)).toEqual(["Dani"]);
    expect(result.errors).toEqual([
      { line: 2, message: "sem nome" },
      { line: 3, message: expect.stringContaining("sem DDD") },
      { line: 4, message: expect.stringContaining("e-mail") },
    ]);
    expect(result.duplicatesInFile).toEqual([{ line: 6, message: "mesmo telefone da linha 5" }]);
  });

  it("sem as colunas obrigatórias, explica o que falta", () => {
    expect(parseClientImport("cliente;email\nAna;a@a.com\n").errors[0].message).toMatch(/telefone/);
    expect(parseClientImport("").errors[0].message).toMatch(/vazio/);
  });
});
