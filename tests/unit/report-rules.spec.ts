import { describe, expect, it } from "vitest";

import {
  centsToCsv,
  delta,
  sumByLocalDay,
  summarizeAppointments,
  summarizeClients,
  summarizeProfessionals,
  summarizeRevenue,
  summarizeServices,
  toCsv,
} from "@/server/modules/report/report-rules";

const TZ = "America/Sao_Paulo";
const at = (iso: string) => new Date(iso);

describe("delta", () => {
  it("variação percentual e null quando não há base", () => {
    expect(delta(120, 100)).toBeCloseTo(0.2);
    expect(delta(80, 100)).toBeCloseTo(-0.2);
    expect(delta(50, 0)).toBeNull();
    expect(delta(0, 0)).toBeNull();
  });
});

describe("summarizeAppointments (antes sem teste — lacuna do diagnóstico)", () => {
  const names = new Map([
    ["joao", "João"],
    ["ana", "Ana"],
  ]);

  it("conta por status, calcula taxas e ordena o ranking por profissional", () => {
    const result = summarizeAppointments(
      [
        { status: "COMPLETED", professionalId: "joao" },
        { status: "COMPLETED", professionalId: "joao" },
        { status: "CANCELLED", professionalId: "ana" },
        { status: "NO_SHOW", professionalId: "joao" },
        { status: "CONFIRMED", professionalId: "removido" },
      ],
      names,
    );
    expect(result.total).toBe(5);
    expect(result.byStatus).toEqual({ PENDING: 0, CONFIRMED: 1, CANCELLED: 1, COMPLETED: 2, NO_SHOW: 1 });
    expect(result.cancellationRate).toBeCloseTo(0.2);
    expect(result.noShowRate).toBeCloseTo(0.2);
    expect(result.mostRequestedProfessional).toEqual({ id: "joao", name: "João", count: 3 });
    expect(result.byProfessional.map((p) => p.name)).toEqual(["João", "(cadastro removido)", "Ana"]);
  });

  it("período vazio não divide por zero", () => {
    const result = summarizeAppointments([], names);
    expect(result).toMatchObject({ total: 0, cancellationRate: 0, noShowRate: 0, mostRequestedProfessional: null });
  });
});

describe("sumByLocalDay", () => {
  it("soma pelo dia local, com zero nos dias vazios", () => {
    const result = sumByLocalDay(
      [
        { at: at("2026-09-23T02:30:00Z"), value: 1000 }, // 22/09 23:30 em SP
        { at: at("2026-09-23T15:00:00Z"), value: 2500 },
        { at: at("2026-09-23T18:00:00Z"), value: 500 },
      ],
      "2026-09-22",
      "2026-09-24",
      TZ,
    );
    expect(result).toEqual([
      { date: "2026-09-22", value: 1000 },
      { date: "2026-09-23", value: 3000 },
      { date: "2026-09-24", value: 0 },
    ]);
  });
});

describe("summarizeRevenue", () => {
  it("recebido, descontos, ticket médio por atendimento e ranking por forma", () => {
    const result = summarizeRevenue([
      { appointmentId: "a1", amountCents: 3000, discountCents: 0, method: "PIX" },
      { appointmentId: "a1", amountCents: 4500, discountCents: 0, method: "CASH" }, // sinal + saldo = 1 atendimento
      { appointmentId: "a2", amountCents: 4500, discountCents: 500, method: "PIX" },
      { appointmentId: "a3", amountCents: 0, discountCents: 1000, method: "PIX" }, // só desconto
    ]);
    expect(result.receivedCents).toBe(12000);
    expect(result.discountCents).toBe(1500);
    expect(result.averageTicketCents).toBe(6000); // 12000 ÷ 2 atendimentos pagos
    expect(result.byMethod).toEqual([
      { method: "PIX", amountCents: 7500, count: 2 },
      { method: "CASH", amountCents: 4500, count: 1 },
    ]);
  });

  it("sem recebimento, ticket médio é null", () => {
    expect(summarizeRevenue([]).averageTicketCents).toBeNull();
  });
});

describe("summarizeServices", () => {
  it("conta atendimentos não cancelados, concluídos e o recebido; ordena por receita", () => {
    const rows = summarizeServices(
      [
        { status: "COMPLETED", serviceId: "corte" },
        { status: "COMPLETED", serviceId: "corte" },
        { status: "CANCELLED", serviceId: "corte" },
        { status: "CONFIRMED", serviceId: "barba" },
      ],
      [
        { serviceId: "corte", amountCents: 5000 },
        { serviceId: "barba", amountCents: 7500 },
      ],
      new Map([
        ["corte", "Corte"],
        ["barba", "Barba"],
      ]),
    );
    expect(rows).toEqual([
      { id: "barba", name: "Barba", appointments: 1, completed: 0, receivedCents: 7500 },
      { id: "corte", name: "Corte", appointments: 2, completed: 2, receivedCents: 5000 },
    ]);
  });
});

describe("summarizeProfessionals", () => {
  it("atendimentos, faltas, ocupação, recebido e comissão congelada por profissional", () => {
    const now = at("2026-09-28T12:00:00Z");
    const rows = summarizeProfessionals({
      professionals: [
        { id: "joao", name: "João" },
        { id: "ana", name: "Ana" },
      ],
      appointments: [
        { status: "COMPLETED", professionalId: "joao", startAt: at("2026-09-10T12:00:00Z"), endAt: at("2026-09-10T13:00:00Z") },
        { status: "NO_SHOW", professionalId: "joao", startAt: at("2026-09-11T12:00:00Z"), endAt: at("2026-09-11T13:00:00Z") },
        { status: "CANCELLED", professionalId: "joao", startAt: at("2026-09-12T12:00:00Z"), endAt: at("2026-09-12T13:00:00Z") },
        { status: "CONFIRMED", professionalId: "joao", startAt: at("2026-09-29T12:00:00Z"), endAt: at("2026-09-29T13:00:00Z") },
      ],
      payments: [
        { professionalId: "joao", amountCents: 5000, commissionPercent: 40 },
        { professionalId: "joao", amountCents: 3000, commissionPercent: 10 },
      ],
      availableMinutes: new Map([
        ["joao", 600],
        ["ana", 0],
      ]),
      now,
    });
    expect(rows[0]).toEqual({
      id: "joao",
      name: "João",
      appointments: 3, // sem o cancelado
      completed: 1,
      noShows: 1,
      noShowRate: 0.5, // 1 falta ÷ 2 que já deveriam ter acontecido
      occupancyRate: 0.3, // 180 min ÷ 600
      receivedCents: 8000,
      commissionCents: 2300, // 40% de 50 + 10% de 30
    });
    expect(rows[1]).toMatchObject({ id: "ana", occupancyRate: null, noShowRate: null, receivedCents: 0 });
  });
});

describe("summarizeClients", () => {
  it("separa novos de quem voltou e monta o top por gasto", () => {
    const periodStart = at("2026-09-01T03:00:00Z");
    const result = summarizeClients({
      appointments: [
        { status: "COMPLETED", clientId: "maria" },
        { status: "COMPLETED", clientId: "maria" },
        { status: "COMPLETED", clientId: "pedro" },
        { status: "CANCELLED", clientId: "lia" }, // cancelado não conta como atendido
      ],
      firstVisitByClient: new Map([
        ["maria", at("2026-06-10T12:00:00Z")], // já era cliente
        ["pedro", at("2026-09-15T12:00:00Z")], // primeira vez no período
      ]),
      periodStart,
      payments: [
        { clientId: "maria", amountCents: 9000 },
        { clientId: "pedro", amountCents: 3500 },
      ],
      clientNames: new Map([
        ["maria", "Maria"],
        ["pedro", "Pedro"],
      ]),
    });
    expect(result).toMatchObject({ served: 2, newClients: 1, returning: 1 });
    expect(result.topSpenders).toEqual([
      { id: "maria", name: "Maria", receivedCents: 9000, visits: 2 },
      { id: "pedro", name: "Pedro", receivedCents: 3500, visits: 1 },
    ]);
  });
});

describe("CSV", () => {
  it("BOM, separador ; , aspas escapadas e decimal com vírgula", () => {
    const csv = toCsv(
      ["Cliente", "Valor"],
      [
        ['Ana "Tatá" Silva', centsToCsv(123456)],
        ["Maria; José", centsToCsv(5000)],
        ["Sem observação", null],
      ],
    );
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toBe(
      '﻿Cliente;Valor\r\n"Ana ""Tatá"" Silva";1234,56\r\n"Maria; José";50,00\r\nSem observação;\r\n',
    );
  });
});
