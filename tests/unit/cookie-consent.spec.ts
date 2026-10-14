import { describe, expect, it } from "vitest";

import { analyticsAllowedOnHost, parseConsent, shouldAskConsent } from "@/lib/cookie-consent";

describe("parseConsent", () => {
  it("só reconhece as duas respostas possíveis", () => {
    expect(parseConsent("aceito")).toBe("aceito");
    expect(parseConsent("recusado")).toBe("recusado");
    expect(parseConsent(null)).toBeNull();
    expect(parseConsent("")).toBeNull();
    expect(parseConsent("true")).toBeNull();
  });
});

describe("shouldAskConsent", () => {
  it("pergunta só a quem ainda não respondeu", () => {
    expect(shouldAskConsent({ choice: null, automated: false })).toBe(true);
    expect(shouldAskConsent({ choice: "aceito", automated: false })).toBe(false);
    expect(shouldAskConsent({ choice: "recusado", automated: false })).toBe(false);
  });

  it("não pergunta a navegador automatizado (testes, robôs)", () => {
    expect(shouldAskConsent({ choice: null, automated: true })).toBe(false);
  });
});

describe("analyticsAllowedOnHost", () => {
  const hosts = ["aprazzo.com.br", "www.aprazzo.com.br"];

  it("só no endereço de produção", () => {
    expect(analyticsAllowedOnHost("aprazzo.com.br", hosts)).toBe(true);
    expect(analyticsAllowedOnHost("WWW.Aprazzo.com.br", hosts)).toBe(true);
  });

  it("nunca em computador local, prévia da Vercel ou domínio parecido", () => {
    expect(analyticsAllowedOnHost("localhost", hosts)).toBe(false);
    expect(analyticsAllowedOnHost("saa-s-agendamento-abc.vercel.app", hosts)).toBe(false);
    expect(analyticsAllowedOnHost("aprazzo.com.br.exemplo.com", hosts)).toBe(false);
  });
});
