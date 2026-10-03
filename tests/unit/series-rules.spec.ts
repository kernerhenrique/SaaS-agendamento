import { describe, expect, it } from "vitest";

import { Weekday } from "@/generated/prisma/enums";
import {
  buildSeriesDates,
  describeFrequency,
  parseSeriesOptions,
  planOccurrences,
  type OccurrenceContext,
} from "@/server/modules/appointment/series-rules";

const TZ = "America/Sao_Paulo";
const TUESDAY = { weekday: Weekday.TUESDAY, startMinute: 540, endMinute: 1080, breakStartMinute: 720, breakEndMinute: 780 };
const at = (iso: string) => new Date(`${iso}-03:00`);

describe("datas da série", () => {
  it("toda semana, a cada 2 e a cada 4, atravessando mês e ano", () => {
    expect(buildSeriesDates("2026-12-15", 1, 4)).toEqual(["2026-12-15", "2026-12-22", "2026-12-29", "2027-01-05"]);
    expect(buildSeriesDates("2026-10-06", 2, 3)).toEqual(["2026-10-06", "2026-10-20", "2026-11-03"]);
    expect(buildSeriesDates("2026-10-06", 4, 3)).toEqual(["2026-10-06", "2026-11-03", "2026-12-01"]);
  });

  it("frequência em texto", () => {
    expect(describeFrequency(1)).toBe("toda semana");
    expect(describeFrequency(2)).toBe("a cada 2 semanas");
  });

  it("valida frequência e limite de 12 datas", () => {
    expect(parseSeriesOptions({ frequencyWeeks: 1, count: 12 })).toEqual({ frequencyWeeks: 1, count: 12 });
    expect(() => parseSeriesOptions({ frequencyWeeks: 3, count: 4 })).toThrow(/Frequência/);
    expect(() => parseSeriesOptions({ frequencyWeeks: 1, count: 13 })).toThrow(/12/);
    expect(() => parseSeriesOptions({ frequencyWeeks: 1, count: 1 })).toThrow(/2 a 12/);
  });
});

describe("por que uma data não dá", () => {
  const context: OccurrenceContext = {
    now: at("2026-10-01T12:00:00"),
    timeZone: TZ,
    weeklyHours: [TUESDAY],
    closures: [{ startDate: "2026-10-13", endDate: "2026-10-13", reason: "Feriado municipal" }],
    blocks: [{ startAt: at("2026-10-20T09:30:00"), endAt: at("2026-10-20T11:00:00") }],
    busy: [{ startAt: at("2026-10-27T10:00:00"), endAt: at("2026-10-27T10:30:00") }],
  };

  it("livre, fechado, bloqueio, ocupado — no fuso do negócio", () => {
    const plan = planOccurrences({ dates: buildSeriesDates("2026-10-06", 1, 5), startMinute: 600, durationMin: 30, context });
    expect(plan.map((o) => [o.date, o.problem])).toEqual([
      ["2026-10-06", null],
      ["2026-10-13", "Fechado: Feriado municipal"],
      ["2026-10-20", "Bloqueio na agenda"],
      ["2026-10-27", "Horário ocupado"],
      ["2026-11-03", null],
    ]);
    expect(plan[0].startAt.toISOString()).toBe("2026-10-06T13:00:00.000Z");
    expect(plan[0].endAt.toISOString()).toBe("2026-10-06T13:30:00.000Z");
  });

  it("fora do expediente (intervalo de almoço, dia sem expediente) e passado", () => {
    expect(planOccurrences({ dates: ["2026-10-06"], startMinute: 720, durationMin: 30, context })[0].problem).toBe("Fora do expediente");
    expect(planOccurrences({ dates: ["2026-10-07"], startMinute: 600, durationMin: 30, context })[0].problem).toBe("Fora do expediente");
    expect(planOccurrences({ dates: ["2026-09-29"], startMinute: 600, durationMin: 30, context })[0].problem).toBe("Já passou");
  });

  it("encostar no horário ocupado não é conflito", () => {
    const touching = planOccurrences({ dates: ["2026-10-27"], startMinute: 630, durationMin: 30, context });
    expect(touching[0].problem).toBeNull();
  });
});
