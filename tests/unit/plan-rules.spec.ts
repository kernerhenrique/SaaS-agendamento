import { describe, expect, it } from "vitest";

import { canActivateAnotherProfessional, parseProfessionalLimit, professionalLimitMessage } from "@/server/modules/business/plan-rules";
import { parseClientFile } from "@/server/modules/onboarding/client-file";

describe("limite do plano (profissionais ativos)", () => {
  it("sem limite (null), sempre cabe mais um", () => {
    expect(canActivateAnotherProfessional(0, null)).toBe(true);
    expect(canActivateAnotherProfessional(40, null)).toBe(true);
  });

  it("com limite, cabe só enquanto houver vaga", () => {
    expect(canActivateAnotherProfessional(0, 1)).toBe(true);
    expect(canActivateAnotherProfessional(1, 1)).toBe(false);
    expect(canActivateAnotherProfessional(2, 3)).toBe(true);
    expect(canActivateAnotherProfessional(3, 3)).toBe(false);
  });

  it("mensagem fala do plano e de como resolver", () => {
    expect(professionalLimitMessage(1)).toMatch(/^Seu plano permite 1 profissional ativo\. .*WhatsApp/);
    expect(professionalLimitMessage(8)).toContain("até 8 profissionais ativos");
  });

  it("valores aceitos no arquivo do cliente e no comando de suporte", () => {
    expect(parseProfessionalLimit(undefined)).toBeNull();
    expect(parseProfessionalLimit("sem")).toBeNull();
    expect(parseProfessionalLimit(1)).toBe(1);
    expect(parseProfessionalLimit("15")).toBe(15);
    expect(() => parseProfessionalLimit(0)).toThrow(/inválido/);
    expect(() => parseProfessionalLimit(2.5)).toThrow(/inválido/);
    expect(() => parseProfessionalLimit("muitos")).toThrow(/inválido/);
  });
});

describe("arquivo do cliente com limiteProfissionais", () => {
  const base = {
    nome: "Estúdio Solo",
    nicho: "generic",
    whatsapp: "(11) 99999-0000",
    horarioFuncionamento: [{ dias: "seg-sex", horario: "09:00-18:00" }],
    profissionais: [{ nome: "Ana" }],
  };

  it("sem o campo, sem limite (como sempre foi)", () => {
    expect(parseClientFile(base).input.maxProfessionals).toBeNull();
  });

  it("Solo: 1 profissional com limite 1", () => {
    expect(parseClientFile({ ...base, limiteProfissionais: 1 }).input.maxProfessionals).toBe(1);
  });

  it("mais profissionais que o plano: recusa explicando", () => {
    expect(() => parseClientFile({ ...base, limiteProfissionais: 1, profissionais: [{ nome: "Ana" }, { nome: "Bia" }] })).toThrow(
      /tem 2 profissionais, mas o plano permite 1/,
    );
  });
});
