import { describe, expect, it } from "vitest";

import {
  AA_CONTRAST,
  accentContrast,
  DEFAULT_ACCENT_COLOR,
  getAccentCssVars,
  getAccentForeground,
  resolveAccentColor,
} from "@/lib/accent-color";

describe("resolveAccentColor", () => {
  it("retorna o padrão quando não há cor definida", () => {
    expect(resolveAccentColor(null)).toBe(DEFAULT_ACCENT_COLOR);
    expect(resolveAccentColor(undefined)).toBe(DEFAULT_ACCENT_COLOR);
    expect(resolveAccentColor("")).toBe(DEFAULT_ACCENT_COLOR);
  });

  it("normaliza hex de 3 dígitos para 6", () => {
    expect(resolveAccentColor("#f00")).toBe("#ff0000");
  });

  it("aceita hex de 6 dígitos, com ou sem #", () => {
    expect(resolveAccentColor("#4f46e5")).toBe("#4f46e5");
    expect(resolveAccentColor("4F46E5")).toBe("#4f46e5");
  });

  it("cai no padrão para valores inválidos", () => {
    expect(resolveAccentColor("não é uma cor")).toBe(DEFAULT_ACCENT_COLOR);
    expect(resolveAccentColor("#12")).toBe(DEFAULT_ACCENT_COLOR);
  });
});

describe("getAccentForeground", () => {
  it("usa texto escuro sobre cores claras", () => {
    expect(getAccentForeground("#ffffff")).toBe("oklch(0.145 0 0)");
    expect(getAccentForeground("#fde047")).toBe("oklch(0.145 0 0)"); // amarelo claro
  });

  it("usa texto claro sobre cores escuras", () => {
    expect(getAccentForeground("#000000")).toBe("oklch(0.985 0 0)");
    expect(getAccentForeground(DEFAULT_ACCENT_COLOR)).toBe("oklch(0.985 0 0)"); // indigo
  });

  it("cores médias ficam com o texto de maior contraste (escuro), não branco", () => {
    expect(getAccentForeground("#f59e0b")).toBe("oklch(0.145 0 0)"); // laranja/âmbar
    expect(getAccentForeground("#22c55e")).toBe("oklch(0.145 0 0)"); // verde
  });
});

describe("accentContrast", () => {
  it("o texto do botão sempre fica com o melhor contraste disponível (≥ 4,5 nas cores comuns)", () => {
    for (const color of [DEFAULT_ACCENT_COLOR, "#f59e0b", "#22c55e", "#0ea5e9", "#dc2626", "#111827"]) {
      expect(accentContrast(color).onButton, color).toBeGreaterThanOrEqual(AA_CONTRAST);
    }
  });

  it("cor clara como texto sobre fundo branco fica abaixo de AA", () => {
    expect(accentContrast("#fde047").onLightBackground).toBeLessThan(AA_CONTRAST);
    expect(accentContrast(DEFAULT_ACCENT_COLOR).onLightBackground).toBeGreaterThanOrEqual(AA_CONTRAST);
  });
});

describe("getAccentCssVars", () => {
  it("gera as custom properties esperadas, com foreground consistente", () => {
    const vars = getAccentCssVars("#4F46E5") as Record<string, string>;
    expect(vars["--primary"]).toBe("#4f46e5");
    expect(vars["--ring"]).toBe("#4f46e5");
    expect(vars["--sidebar-primary"]).toBe("#4f46e5");
    expect(vars["--primary-foreground"]).toBe(vars["--sidebar-primary-foreground"]);
  });
});
