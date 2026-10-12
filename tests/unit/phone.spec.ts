import { describe, expect, it } from "vitest";

import { formatPhoneBR, nationalDigitsBR, normalizePhoneBR } from "@/lib/phone";

describe("normalizePhoneBR", () => {
  it("deixa só dígitos, para que máscaras diferentes virem o mesmo cliente", () => {
    expect(normalizePhoneBR("(11) 99999-0001")).toBe("11999990001");
    expect(normalizePhoneBR("11999990001")).toBe("11999990001");
    expect(normalizePhoneBR(" 11 9 9999 0001 ")).toBe("11999990001");
  });
});

describe("formatPhoneBR", () => {
  it("formata progressivamente enquanto digita", () => {
    expect(formatPhoneBR("1")).toBe("1");
    expect(formatPhoneBR("11")).toBe("11");
    expect(formatPhoneBR("119")).toBe("(11) 9");
    expect(formatPhoneBR("11987")).toBe("(11) 987");
    expect(formatPhoneBR("119876")).toBe("(11) 9876");
    expect(formatPhoneBR("1198765")).toBe("(11) 9876-5");
  });

  it("formata celular completo (11 dígitos)", () => {
    expect(formatPhoneBR("11987654321")).toBe("(11) 98765-4321");
  });

  it("formata fixo completo (10 dígitos)", () => {
    expect(formatPhoneBR("1123456789")).toBe("(11) 2345-6789");
  });

  it("ignora caracteres não numéricos e limita a 11 dígitos", () => {
    expect(formatPhoneBR("(11) 98765-4321extra")).toBe("(11) 98765-4321");
  });
});

describe("nationalDigitsBR", () => {
  it("tira o +55 colado do WhatsApp e o zero de discagem", () => {
    expect(nationalDigitsBR("+55 11 98765-4321")).toBe("11987654321");
    expect(nationalDigitsBR("5511987654321")).toBe("11987654321");
    expect(nationalDigitsBR("+55 (11) 2345-6789")).toBe("1123456789");
    expect(nationalDigitsBR("011 98765-4321")).toBe("11987654321");
    expect(nationalDigitsBR("+55 011 98765-4321")).toBe("11987654321");
  });

  it("não confunde o DDD 55 (interior do RS) com o DDI", () => {
    expect(nationalDigitsBR("(55) 99999-1234")).toBe("55999991234");
    expect(nationalDigitsBR("55 3222-1234")).toBe("5532221234");
    expect(nationalDigitsBR("+55 55 99999-1234")).toBe("55999991234");
  });
});

describe("formatPhoneBR com o número colado", () => {
  it("mostra o número certo quando vem com +55 (antes cortava os dois últimos dígitos)", () => {
    expect(formatPhoneBR("+55 11 98765-4321")).toBe("(11) 98765-4321");
    expect(formatPhoneBR("011987654321")).toBe("(11) 98765-4321");
  });

  it("digitando o 55 na frente, um dígito por vez, termina no número certo", () => {
    let field = "";
    for (const digit of "5511987654321") field = formatPhoneBR(field + digit);
    expect(field).toBe("(11) 98765-4321");
  });
});
