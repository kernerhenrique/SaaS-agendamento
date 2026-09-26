import { describe, expect, it } from "vitest";

import { formatPhoneBR, normalizePhoneBR } from "@/lib/phone";

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
