import { describe, expect, it } from "vitest";

import { localMinutesToUtc } from "@/lib/date";
import { bookingWindow, canClientChange } from "@/server/modules/appointment/booking-policy";

const TIMEZONE = "America/Sao_Paulo";
const at = (dateISO: string, minutes: number) => localMinutesToUtc(dateISO, minutes, TIMEZONE);

describe("bookingWindow (políticas da reserva pública)", () => {
  it("sem antecedência, o primeiro horário é agora", () => {
    const now = at("2026-09-24", 14 * 60);
    expect(bookingWindow({ now, timeZone: TIMEZONE, minNoticeMinutes: 0, maxWindowDays: 60 }).earliestStart).toEqual(now);
  });

  it("antecedência mínima empurra o primeiro horário", () => {
    const now = at("2026-09-24", 14 * 60);
    const { earliestStart } = bookingWindow({ now, timeZone: TIMEZONE, minNoticeMinutes: 120, maxWindowDays: 60 });
    expect(earliestStart).toEqual(at("2026-09-24", 16 * 60));
  });

  it("janela conta a partir de hoje no fuso do negócio, inclusive", () => {
    const now = at("2026-09-24", 10 * 60);
    expect(bookingWindow({ now, timeZone: TIMEZONE, minNoticeMinutes: 0, maxWindowDays: 7 }).lastDate).toBe("2026-10-01");
  });

  it("usa a data local, não a data UTC (23:30 em São Paulo já é amanhã em UTC)", () => {
    const now = at("2026-09-24", 23 * 60 + 30);
    expect(bookingWindow({ now, timeZone: TIMEZONE, minNoticeMinutes: 0, maxWindowDays: 1 }).lastDate).toBe("2026-09-25");
  });
});

describe("canClientChange (prazo para cancelar/remarcar pelo link)", () => {
  const startAt = at("2026-09-24", 15 * 60);

  it("prazo 0: pode até o horário marcado", () => {
    expect(canClientChange(startAt, at("2026-09-24", 14 * 60 + 59), 0)).toBe(true);
    expect(canClientChange(startAt, startAt, 0)).toBe(false);
  });

  it("prazo de 2 h: pode até 13:00, não depois", () => {
    expect(canClientChange(startAt, at("2026-09-24", 12 * 60 + 59), 2)).toBe(true);
    expect(canClientChange(startAt, at("2026-09-24", 13 * 60), 2)).toBe(false);
    expect(canClientChange(startAt, at("2026-09-24", 14 * 60), 2)).toBe(false);
  });

  it("prazo de 24 h atravessa o dia anterior", () => {
    expect(canClientChange(startAt, at("2026-09-23", 14 * 60), 24)).toBe(true);
    expect(canClientChange(startAt, at("2026-09-23", 16 * 60), 24)).toBe(false);
  });
});
