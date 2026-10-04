import { describe, expect, it } from "vitest";

import { Weekday } from "@/generated/prisma/enums";
import {
  parseClientFile,
  parseDays,
  parsePriceCents,
  parseSlug,
  parseTimeRange,
  slugify,
} from "@/server/modules/onboarding/client-file";
import { buildOwnerMessage } from "@/server/modules/onboarding/delivery-messages";
import { NICHE_CATALOGS } from "@/server/modules/onboarding/niche-catalogs";

const base = {
  nome: "Barbearia do Zé",
  nicho: "barbershop",
  whatsapp: "(19) 99999-0000",
  horarioFuncionamento: [{ dias: "ter-sex", horario: "09:00-20:00" }, { dias: "sab", horario: "08:00-18:00" }],
  profissionais: [{ nome: "Zé" }],
};

describe("arquivo do cliente: formatos em português", () => {
  it("dias: intervalo, lista, acento e intervalo que vira a semana", () => {
    expect(parseDays("seg-sex")).toEqual([Weekday.MONDAY, Weekday.TUESDAY, Weekday.WEDNESDAY, Weekday.THURSDAY, Weekday.FRIDAY]);
    expect(parseDays("seg, qua,Sáb")).toEqual([Weekday.MONDAY, Weekday.WEDNESDAY, Weekday.SATURDAY]);
    expect(parseDays("sex-seg")).toEqual([Weekday.SUNDAY, Weekday.MONDAY, Weekday.FRIDAY, Weekday.SATURDAY]);
    expect(() => parseDays("segunda-feira-santa")).toThrow(/Dia da semana/);
  });

  it("horário: fim depois do início", () => {
    expect(parseTimeRange("09:00-19:30")).toEqual({ start: 540, end: 1170 });
    expect(() => parseTimeRange("19:00-09:00")).toThrow(/depois do início/);
    expect(() => parseTimeRange("9h às 19h")).toThrow();
  });

  it("preço: número, vírgula e R$ com milhar viram centavos", () => {
    expect(parsePriceCents(45)).toBe(4500);
    expect(parsePriceCents("45,90")).toBe(4590);
    expect(parsePriceCents("R$ 1.234,56")).toBe(123456);
    expect(() => parsePriceCents("grátis")).toThrow(/Preço/);
  });

  it("slug: sugerido pelo nome, validado e sem os reservados", () => {
    expect(slugify("Barbearia do Zé & Filhos")).toBe("barbearia-do-ze-filhos");
    expect(parseSlug("barbearia-do-ze")).toBe("barbearia-do-ze");
    expect(() => parseSlug("admin")).toThrow(/reservado/);
    expect(() => parseSlug("precos")).toThrow(/reservado/);
    expect(() => parseSlug("com espaço")).toThrow(/minúsculas/);
    expect(() => parseSlug("-ze")).toThrow();
  });
});

describe("parseClientFile", () => {
  it("sem serviços usa o catálogo do nicho, e o profissional sem expediente segue o horário do negócio", () => {
    const { input, warnings } = parseClientFile(base);
    expect(input.slug).toBe("barbearia-do-ze");
    expect(input.timezone).toBe("America/Sao_Paulo");
    expect(input.whatsapp).toBe("19999990000");
    expect(input.accentColor).toBe("#0F766E");
    expect(input.services).toEqual(NICHE_CATALOGS.barbershop);
    expect(input.professionals[0].serviceNames).toHaveLength(NICHE_CATALOGS.barbershop.length);
    expect(input.professionals[0].workingHours.map((day) => day.weekday)).toEqual([
      Weekday.TUESDAY,
      Weekday.WEDNESDAY,
      Weekday.THURSDAY,
      Weekday.FRIDAY,
      Weekday.SATURDAY,
    ]);
    expect(input.policies).toMatchObject({ minBookingNoticeMinutes: 0, maxBookingWindowDays: 60, cancellationDeadlineHours: 0 });
    expect(warnings).toEqual([]);
  });

  it("serviços próprios, expediente com intervalo e serviços por profissional", () => {
    const { input, warnings } = parseClientFile({
      ...base,
      servicos: [
        { nome: "Corte", duracao: 30, preco: 40 },
        { nome: "Pigmentação", categoria: "Cabelo", duracao: 40, preco: "45,00", aPartirDe: true },
      ],
      profissionais: [
        {
          nome: "Zé",
          cor: "orange",
          expediente: [
            { dias: "ter-sex", horario: "09:00-19:00", intervalo: "12:00-13:00" },
            { dias: "sab", horario: "09:00-18:00" },
          ],
        },
        { nome: "Rafa", servicos: ["corte"] },
      ],
    });
    expect(input.services[1]).toMatchObject({ name: "Pigmentação", priceCents: 4500, priceFrom: true, category: "Cabelo" });
    expect(input.services[0].category).toBe("Serviços");
    expect(input.professionals[0]).toMatchObject({ color: "orange" });
    expect(input.professionals[0].workingHours[0]).toMatchObject({ startMinute: 540, endMinute: 1140, breakStartMinute: 720, breakEndMinute: 780 });
    expect(input.professionals[1].serviceNames).toEqual(["Corte"]);
    expect(warnings).toEqual([]);
  });

  it("avisa (sem bloquear) cor clara, falta de WhatsApp e serviço que ninguém faz", () => {
    const { warnings } = parseClientFile({
      ...base,
      whatsapp: undefined,
      cor: "#FDE68A",
      servicos: [
        { nome: "Corte", duracao: 30, preco: 40 },
        { nome: "Barba", duracao: 30, preco: 30 },
      ],
      profissionais: [{ nome: "Zé", servicos: ["Corte"] }],
    });
    expect(warnings.some((w) => w.includes("WhatsApp"))).toBe(true);
    expect(warnings.some((w) => w.includes("clara demais"))).toBe(true);
    expect(warnings.some((w) => w.includes('"Barba"'))).toBe(true);
  });

  it("recusa com mensagem clara o que impediria a página de funcionar", () => {
    expect(() => parseClientFile({ ...base, nicho: "padaria" })).toThrow(/Nicho inválido/);
    expect(() => parseClientFile({ ...base, profissionais: [] })).toThrow(/pelo menos um profissional/);
    expect(() => parseClientFile({ ...base, profissionais: [{ nome: "Zé", servicos: ["Massagem"] }] })).toThrow(/não está na lista/);
    expect(() => parseClientFile({ ...base, profissionais: [{ nome: "Zé", cor: "#ff0000" }] })).toThrow(/cor/);
    // Expediente fora do horário de funcionamento (sábado o negócio fecha às 18:00; domingo, fechado).
    expect(() =>
      parseClientFile({ ...base, profissionais: [{ nome: "Zé", expediente: [{ dias: "sab", horario: "09:00-19:00" }] }] }),
    ).toThrow(/passa do horário de funcionamento/);
    expect(() =>
      parseClientFile({ ...base, profissionais: [{ nome: "Zé", expediente: [{ dias: "dom", horario: "09:00-12:00" }] }] }),
    ).toThrow(/fechado/);
    expect(() =>
      parseClientFile({ ...base, profissionais: [{ nome: "Zé", expediente: [{ dias: "seg", horario: "09:00-18:00", intervalo: "08:00-09:00" }] }] }),
    ).toThrow(/dentro do expediente/);
    expect(() => parseClientFile({ ...base, horarioFuncionamento: [] })).toThrow(/funcionamento/);
    expect(() => parseClientFile({ ...base, fuso: "Lua/Base" })).toThrow(/Fuso/);
  });
});

describe("mensagem de entrega", () => {
  it("usa os termos do nicho e traz os dois links", () => {
    const message = buildOwnerMessage({
      businessName: "Clínica Pele Leve",
      businessType: "beauty_clinic",
      publicUrl: "https://aprazzo.com.br/clinica-pele-leve",
      ownerInviteUrl: "https://aprazzo.com.br/admin/convite/abc",
      ownerInviteExpiresAt: "2026-10-09T15:00:00.000Z",
      timezone: "America/Sao_Paulo",
    });
    expect(message).toContain("https://aprazzo.com.br/admin/convite/abc");
    expect(message).toContain("https://aprazzo.com.br/clinica-pele-leve");
    expect(message).toContain("menu Especialistas");
    expect(message).toContain("sexta-feira, 09 de outubro");
  });
});
