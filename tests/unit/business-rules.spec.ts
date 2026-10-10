import { describe, expect, it } from "vitest";

import { newPasswordProblem } from "@/server/modules/auth/password-rules";
import {
  parseBookingPolicies,
  parseBranding,
  parseBusinessHours,
  parseBusinessProfile,
  parseInstagram,
  parseSoloHours,
  parseSoloProfessionalName,
} from "@/server/modules/business/business-rules";

describe("parseBusinessProfile", () => {
  const base = { name: " Barbearia X ", whatsapp: "(11) 98888-0000" };

  it("normaliza nome, WhatsApp (só dígitos) e campos vazios", () => {
    expect(parseBusinessProfile({ ...base, address: "  " })).toEqual({
      name: "Barbearia X",
      address: null,
      whatsapp: "11988880000",
      instagramUrl: null,
    });
  });

  it("ignora tipo de negócio: o nicho é definido na criação do cliente, não pela tela", () => {
    expect(parseBusinessProfile({ ...base, businessType: "tattoo_studio" })).not.toHaveProperty("businessType");
  });

  it("aceita WhatsApp com +55", () => {
    expect(parseBusinessProfile({ ...base, whatsapp: "+55 11 98888-0000" }).whatsapp).toBe("11988880000");
  });

  it("recusa nome vazio e WhatsApp sem DDD", () => {
    expect(() => parseBusinessProfile({ ...base, name: "" })).toThrow("nome");
    expect(() => parseBusinessProfile({ ...base, whatsapp: "98888-0000" })).toThrow("DDD");
  });
});

describe("parseInstagram", () => {
  it("aceita @perfil, perfil e link, gravando sempre o link", () => {
    expect(parseInstagram("@navalha.ouro")).toBe("https://instagram.com/navalha.ouro");
    expect(parseInstagram("navalha_ouro")).toBe("https://instagram.com/navalha_ouro");
    expect(parseInstagram("https://www.instagram.com/navalha/?hl=pt")).toBe("https://instagram.com/navalha");
  });

  it("recusa texto que não é perfil", () => {
    expect(() => parseInstagram("minha barbearia")).toThrow("Instagram");
  });
});

describe("parseBranding", () => {
  it("aceita links https e normaliza a cor", () => {
    expect(parseBranding({ logoUrl: "https://exemplo.com/logo.png", coverUrl: "", accentColor: "#a1b2c3" })).toEqual({
      logoUrl: "https://exemplo.com/logo.png",
      coverUrl: null,
      accentColor: "#A1B2C3",
    });
  });

  it("recusa http, texto solto e cor fora do formato", () => {
    expect(() => parseBranding({ logoUrl: "http://exemplo.com/a.png", accentColor: "#000000" })).toThrow("https://");
    expect(() => parseBranding({ coverUrl: "foto.png", accentColor: "#000000" })).toThrow("link completo");
    expect(() => parseBranding({ accentColor: "azul" })).toThrow("#RRGGBB");
  });
});

describe("parseBookingPolicies", () => {
  const valid = { minBookingNoticeMinutes: 120, maxBookingWindowDays: 60, cancellationDeadlineHours: 24, policyText: "" };

  it("aceita valores dentro dos limites", () => {
    expect(parseBookingPolicies(valid)).toEqual({ ...valid, policyText: null });
  });

  it("recusa janela zero, antecedência negativa e números quebrados", () => {
    expect(() => parseBookingPolicies({ ...valid, maxBookingWindowDays: 0 })).toThrow("Janela");
    expect(() => parseBookingPolicies({ ...valid, minBookingNoticeMinutes: -1 })).toThrow("Antecedência");
    expect(() => parseBookingPolicies({ ...valid, cancellationDeadlineHours: 1.5 })).toThrow("Prazo");
  });
});

describe("parseBusinessHours", () => {
  it("aceita um intervalo por dia", () => {
    expect(parseBusinessHours([{ weekday: "MONDAY", startMinute: 540, endMinute: 1140 }])).toHaveLength(1);
    expect(parseBusinessHours([])).toEqual([]);
  });

  it("recusa dia repetido, dia inválido e fechamento antes da abertura", () => {
    const monday = { weekday: "MONDAY", startMinute: 540, endMinute: 1140 };
    expect(() => parseBusinessHours([monday, monday])).toThrow("uma vez");
    expect(() => parseBusinessHours([{ ...monday, weekday: "FERIADO" }])).toThrow("Dia");
    expect(() => parseBusinessHours([{ ...monday, endMinute: 500 }])).toThrow("depois da abertura");
  });
});

describe("newPasswordProblem", () => {
  it("exige 8 caracteres e senha diferente da atual", () => {
    expect(newPasswordProblem("senha123", "curta")).toMatch("8 caracteres");
    expect(newPasswordProblem("senha123", "senha123")).toMatch("diferente");
    expect(newPasswordProblem("senha123", "nova-senha-boa")).toBeNull();
  });
});

describe("parseSoloHours (plano Solo: horário da página + expediente)", () => {
  it("aceita o dia com almoço e o dia sem", () => {
    expect(
      parseSoloHours([
        { weekday: "TUESDAY", startMinute: 540, endMinute: 1140, breakStartMinute: 750, breakEndMinute: 810 },
        { weekday: "SATURDAY", startMinute: 480, endMinute: 840, breakStartMinute: null, breakEndMinute: null },
      ]),
    ).toEqual([
      { weekday: "TUESDAY", startMinute: 540, endMinute: 1140, breakStartMinute: 750, breakEndMinute: 810 },
      { weekday: "SATURDAY", startMinute: 480, endMinute: 840, breakStartMinute: null, breakEndMinute: null },
    ]);
  });

  it("sem os campos de almoço, o dia fica sem almoço", () => {
    expect(parseSoloHours([{ weekday: "MONDAY", startMinute: 540, endMinute: 1080 }])).toEqual([
      { weekday: "MONDAY", startMinute: 540, endMinute: 1080, breakStartMinute: null, breakEndMinute: null },
    ]);
  });

  it("recusa almoço fora do dia, invertido ou pela metade", () => {
    const day = { weekday: "MONDAY", startMinute: 540, endMinute: 1080 };
    expect(() => parseSoloHours([{ ...day, breakStartMinute: 500, breakEndMinute: 600 }])).toThrow(/intervalo/);
    expect(() => parseSoloHours([{ ...day, breakStartMinute: 780, breakEndMinute: 720 }])).toThrow(/intervalo/);
    expect(() => parseSoloHours([{ ...day, breakStartMinute: 720, breakEndMinute: null }])).toThrow(/intervalo/);
  });

  it("mantém as regras do horário comum (dia repetido, fim antes do início)", () => {
    expect(() =>
      parseSoloHours([
        { weekday: "MONDAY", startMinute: 540, endMinute: 1080 },
        { weekday: "MONDAY", startMinute: 600, endMinute: 1080 },
      ]),
    ).toThrow(/uma vez/);
    expect(() => parseSoloHours([{ weekday: "MONDAY", startMinute: 1080, endMinute: 540 }])).toThrow(/fechamento/);
  });
});

describe("parseSoloProfessionalName", () => {
  it("apara o nome e recusa vazio", () => {
    expect(parseSoloProfessionalName("  Ana  ")).toBe("Ana");
    expect(() => parseSoloProfessionalName("   ")).toThrow(/seu nome/i);
    expect(() => parseSoloProfessionalName(undefined)).toThrow(/seu nome/i);
  });
});
