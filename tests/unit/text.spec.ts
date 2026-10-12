import { describe, expect, it } from "vitest";

import { shortNames } from "@/lib/text";

describe("shortNames", () => {
  it("usa o primeiro nome", () => {
    expect(shortNames(["João Barbeiro", "Marcos Estilista"])).toEqual(["João", "Marcos"]);
  });

  it("leva o nome junto do tratamento: duas doutoras não viram duas abas \"Dra.\"", () => {
    expect(shortNames(["Dra. Ana", "Dra. Bia Souza", "Bia"])).toEqual(["Dra. Ana", "Dra. Bia", "Bia"]);
  });

  it("primeiros nomes iguais ficam com o nome inteiro", () => {
    expect(shortNames(["João Silva", "João Souza", "Léo"])).toEqual(["João Silva", "João Souza", "Léo"]);
  });

  it("nome de uma palavra só e espaços sobrando", () => {
    expect(shortNames(["  Ana  ", "Dr."])).toEqual(["Ana", "Dr."]);
  });
});
