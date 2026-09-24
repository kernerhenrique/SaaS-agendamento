import { describe, expect, it } from "vitest";

import { Weekday } from "@/generated/prisma/enums";
import { localDayRangeUtc, localMinutesToUtc } from "@/lib/date";
import { computeSlotsForProfessional, type WorkingHoursWindow } from "@/server/modules/appointment/availability";

const TIMEZONE = "America/Sao_Paulo";
const DATE = "2026-09-24"; // quinta-feira, sem efeito de horário de verão em SP
const PROFESSIONAL_ID = "prof_1";

function fullDayWorkingHours(overrides: Partial<WorkingHoursWindow> = {}): WorkingHoursWindow {
  return {
    weekday: Weekday.THURSDAY,
    startMinute: 9 * 60, // 09:00
    endMinute: 18 * 60, // 18:00
    breakStartMinute: null,
    breakEndMinute: null,
    ...overrides,
  };
}

function localTime(minutes: number) {
  return localMinutesToUtc(DATE, minutes, TIMEZONE);
}

describe("computeSlotsForProfessional", () => {
  it("gera slots do início ao fim do expediente, respeitando a duração do serviço", () => {
    const slots = computeSlotsForProfessional({
      professionalId: PROFESSIONAL_ID,
      dateISO: DATE,
      timeZone: TIMEZONE,
      workingHours: fullDayWorkingHours({ startMinute: 9 * 60, endMinute: 12 * 60 }),
      busyIntervals: [],
      durationMin: 30,
      now: localTime(0),
    });

    // expediente 09:00-12:00, serviço de 30min, grade de 15min:
    // último início possível é 11:30 (11:30 + 30min = 12:00)
    expect(slots).toHaveLength(11);
    expect(slots[0].startAt).toEqual(localTime(9 * 60));
    expect(slots[0].endAt).toEqual(localTime(9 * 60 + 30));
    expect(slots.at(-1)?.startAt).toEqual(localTime(11 * 60 + 30));
    expect(slots.every((slot) => slot.professionalId === PROFESSIONAL_ID)).toBe(true);
  });

  it("não gera slot que ultrapasse o fim do expediente, mesmo com duração que não é múltiplo da grade", () => {
    const slots = computeSlotsForProfessional({
      professionalId: PROFESSIONAL_ID,
      dateISO: DATE,
      timeZone: TIMEZONE,
      workingHours: fullDayWorkingHours({ startMinute: 9 * 60, endMinute: 10 * 60 }),
      busyIntervals: [],
      durationMin: 50,
      now: localTime(0),
    });

    // expediente de 1h, serviço de 50min: só cabe o horário das 09:00
    // (09:15 + 50min = 10:05, ultrapassaria o expediente)
    expect(slots).toHaveLength(1);
    expect(slots[0].startAt).toEqual(localTime(9 * 60));
  });

  it("profissional sem expediente no dia (workingHours nulo) não tem nenhum slot", () => {
    const slots = computeSlotsForProfessional({
      professionalId: PROFESSIONAL_ID,
      dateISO: DATE,
      timeZone: TIMEZONE,
      workingHours: null,
      busyIntervals: [],
      durationMin: 30,
      now: localTime(0),
    });

    expect(slots).toEqual([]);
  });

  it("exclui slots que colidem com o intervalo de almoço, mantendo os vizinhos", () => {
    const slots = computeSlotsForProfessional({
      professionalId: PROFESSIONAL_ID,
      dateISO: DATE,
      timeZone: TIMEZONE,
      workingHours: fullDayWorkingHours({
        startMinute: 11 * 60,
        endMinute: 14 * 60,
        breakStartMinute: 12 * 60,
        breakEndMinute: 13 * 60,
      }),
      busyIntervals: [],
      durationMin: 30,
      now: localTime(0),
    });

    const startMinutes = slots.map((slot) => (slot.startAt.getTime() - localTime(0).getTime()) / 60_000);
    // 11:00 e 11:30 cabem antes do almoço (11:30+30=12:00, não colide)
    expect(startMinutes).toContain(11 * 60);
    expect(startMinutes).toContain(11 * 60 + 30);
    // nada entre 12:00 e 13:00 (colide com o almoço)
    expect(startMinutes).not.toContain(12 * 60);
    expect(startMinutes).not.toContain(12 * 60 + 30);
    // 13:00 em diante volta a ficar livre
    expect(startMinutes).toContain(13 * 60);
  });

  it("exclui slots que colidem com um agendamento já existente, mas mantém os que só encostam na borda", () => {
    const busyStart = localTime(10 * 60);
    const busyEnd = localTime(10 * 60 + 30);

    const slots = computeSlotsForProfessional({
      professionalId: PROFESSIONAL_ID,
      dateISO: DATE,
      timeZone: TIMEZONE,
      workingHours: fullDayWorkingHours({ startMinute: 9 * 60, endMinute: 12 * 60 }),
      busyIntervals: [{ start: busyStart, end: busyEnd }],
      durationMin: 30,
      now: localTime(0),
    });

    const startMinutes = slots.map((slot) => (slot.startAt.getTime() - localTime(0).getTime()) / 60_000);
    // colide diretamente com o agendamento das 10:00-10:30
    expect(startMinutes).not.toContain(10 * 60);
    // termina exatamente quando o agendamento começa -> não colide (borda exclusiva)
    expect(startMinutes).toContain(9 * 60 + 30);
    // começa exatamente quando o agendamento termina -> não colide (borda exclusiva)
    expect(startMinutes).toContain(10 * 60 + 30);
  });

  it("bloqueio manual (TimeBlock) cobrindo o expediente inteiro remove todos os slots do dia", () => {
    const { start: dayStart, end: dayEnd } = localDayRangeUtc(DATE, TIMEZONE);

    const slots = computeSlotsForProfessional({
      professionalId: PROFESSIONAL_ID,
      dateISO: DATE,
      timeZone: TIMEZONE,
      workingHours: fullDayWorkingHours({ startMinute: 9 * 60, endMinute: 18 * 60 }),
      busyIntervals: [{ start: dayStart, end: dayEnd }],
      durationMin: 30,
      now: localTime(0),
    });

    expect(slots).toEqual([]);
  });

  it("não retorna horários que já passaram em relação a 'now'", () => {
    const slots = computeSlotsForProfessional({
      professionalId: PROFESSIONAL_ID,
      dateISO: DATE,
      timeZone: TIMEZONE,
      workingHours: fullDayWorkingHours({ startMinute: 9 * 60, endMinute: 12 * 60 }),
      busyIntervals: [],
      durationMin: 30,
      now: localTime(10 * 60 + 1), // 10:00:01, logo após o início do slot das 10:00
    });

    const startMinutes = slots.map((slot) => (slot.startAt.getTime() - localTime(0).getTime()) / 60_000);
    expect(startMinutes).not.toContain(9 * 60);
    expect(startMinutes).not.toContain(9 * 60 + 30);
    expect(startMinutes).not.toContain(10 * 60);
    expect(startMinutes).toContain(10 * 60 + 30);
  });

  it("duração maior de serviço (combo) gera menos slots que um serviço mais curto no mesmo expediente", () => {
    const workingHours = fullDayWorkingHours({ startMinute: 9 * 60, endMinute: 12 * 60 });

    const slotsCorteRapido = computeSlotsForProfessional({
      professionalId: PROFESSIONAL_ID,
      dateISO: DATE,
      timeZone: TIMEZONE,
      workingHours,
      busyIntervals: [],
      durationMin: 15,
      now: localTime(0),
    });

    const slotsCombo = computeSlotsForProfessional({
      professionalId: PROFESSIONAL_ID,
      dateISO: DATE,
      timeZone: TIMEZONE,
      workingHours,
      busyIntervals: [],
      durationMin: 90,
      now: localTime(0),
    });

    expect(slotsCorteRapido.length).toBeGreaterThan(slotsCombo.length);
    // expediente 09:00-12:00 (180min), serviço de 90min: último início possível
    // é 10:30 (10:30+90min=12:00); de 09:00 a 10:30 em passos de 15min = 7 horários
    expect(slotsCombo).toHaveLength(7);
  });

  it("rejeita durationMin inválido", () => {
    expect(() =>
      computeSlotsForProfessional({
        professionalId: PROFESSIONAL_ID,
        dateISO: DATE,
        timeZone: TIMEZONE,
        workingHours: fullDayWorkingHours(),
        busyIntervals: [],
        durationMin: 0,
      }),
    ).toThrow();
  });
});
