import { describe, expect, it } from "vitest";

import { findHoursConflicts } from "@/server/modules/business/hours-rules";
import { buildTimeBlockRange, describeTimeBlock } from "@/server/modules/professional/time-block-rules";

const TZ = "America/Sao_Paulo";

describe("folgas e ausências", () => {
  it("período de dias inteiros vai da meia-noite do primeiro à meia-noite depois do último", () => {
    const { startAt, endAt } = buildTimeBlockRange({ mode: "days", startDate: "2026-10-15", endDate: "2026-10-30" }, TZ);
    expect(startAt.toISOString()).toBe("2026-10-15T03:00:00.000Z");
    expect(endAt.toISOString()).toBe("2026-10-31T03:00:00.000Z");
    expect(describeTimeBlock(startAt, endAt, TZ)).toBe("15/10 a 30/10 · dias inteiros");
  });

  it("um dia só, sem data final", () => {
    const { startAt, endAt } = buildTimeBlockRange({ mode: "days", startDate: "2026-10-12", endDate: "" }, TZ);
    expect(describeTimeBlock(startAt, endAt, TZ)).toBe("12/10 · dia inteiro");
  });

  it("só algumas horas de um dia", () => {
    const { startAt, endAt } = buildTimeBlockRange({ mode: "hours", date: "2026-10-20", startTime: "14:00", endTime: "16:00" }, TZ);
    expect(describeTimeBlock(startAt, endAt, TZ)).toBe("20/10, 14:00 às 16:00");
  });

  it("recusa período invertido e horário sem fim depois do início", () => {
    expect(() => buildTimeBlockRange({ mode: "days", startDate: "2026-10-20", endDate: "2026-10-19" }, TZ)).toThrow();
    expect(() => buildTimeBlockRange({ mode: "hours", date: "2026-10-20", startTime: "16:00", endTime: "14:00" }, TZ)).toThrow();
  });

  it("bloqueio antigo de 00:00 a 23:59 aparece como dia inteiro; atravessando dias mostra os dois", () => {
    expect(describeTimeBlock(new Date("2026-10-20T03:00:00Z"), new Date("2026-10-21T02:59:00Z"), TZ)).toBe("20/10 · dia inteiro");
    expect(describeTimeBlock(new Date("2026-10-20T17:00:00Z"), new Date("2026-10-22T13:00:00Z"), TZ)).toBe("20/10, 14:00 até 22/10, 10:00");
  });
});

describe("expediente dentro do horário do negócio", () => {
  const business = [
    { weekday: "MONDAY" as const, startMinute: 540, endMinute: 1140 },
    { weekday: "SATURDAY" as const, startMinute: 540, endMinute: 1020 },
  ];

  it("dentro do horário: sem conflito; negócio sem horário cadastrado: não compara", () => {
    expect(findHoursConflicts(business, [{ weekday: "MONDAY", startMinute: 600, endMinute: 1080 }])).toEqual([]);
    expect(findHoursConflicts([], [{ weekday: "SUNDAY", startMinute: 0, endMinute: 1440 }])).toEqual([]);
  });

  it("passa do fechamento ou trabalha em dia fechado", () => {
    const conflicts = findHoursConflicts(business, [
      { weekday: "SATURDAY", startMinute: 600, endMinute: 1140 },
      { weekday: "SUNDAY", startMinute: 600, endMinute: 900 },
    ]);
    expect(conflicts.map((c) => [c.weekday, c.business])).toEqual([
      ["SATURDAY", { startMinute: 540, endMinute: 1020 }],
      ["SUNDAY", null],
    ]);
  });
});
