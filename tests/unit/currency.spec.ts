import { describe, expect, it } from "vitest";

import { digitsToCents, formatCentsInput, formatPriceFromCents } from "@/lib/currency";

describe("moeda pt-BR", () => {
  it("formata centavos com milhar e vírgula", () => {
    expect(formatCentsInput(123456)).toBe("1.234,56");
    expect(formatCentsInput(0)).toBe("0,00");
    expect(formatPriceFromCents(5000).replace(/\s/g, " ")).toBe("R$ 50,00");
  });

  it("dígitos entram pela direita, como em maquininha", () => {
    expect(digitsToCents("5")).toBe(5);
    // Campo com "50,00" + tecla 5 → R$ 500,05.
    expect(digitsToCents("50,005")).toBe(50005);
    expect(digitsToCents("1.234,56")).toBe(123456);
    expect(digitsToCents("")).toBe(0);
  });

  it("apagar tudo volta a zero e o valor tem limite", () => {
    expect(digitsToCents("R$ ")).toBe(0);
    expect(digitsToCents("12345678901")).toBe(345678901);
  });
});
