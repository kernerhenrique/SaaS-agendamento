import { describe, expect, it } from "vitest";

import { Weekday } from "@/generated/prisma/enums";
import { localMinutesToUtc } from "@/lib/date";
import { computeSlotsForProfessional, isOfferedSlot } from "@/server/modules/appointment/availability";

const TIMEZONE = "America/Sao_Paulo";
const DATE = "2026-09-24"; // quinta-feira
const at = (minutes: number) => localMinutesToUtc(DATE, minutes, TIMEZONE);

// Expediente 09:00–12:00, almoço 10:00–10:30, um bloqueio 11:00–11:30.
const slots = computeSlotsForProfessional({
  professionalId: "p1",
  dateISO: DATE,
  timeZone: TIMEZONE,
  workingHours: {
    weekday: Weekday.THURSDAY,
    startMinute: 9 * 60,
    endMinute: 12 * 60,
    breakStartMinute: 10 * 60,
    breakEndMinute: 10 * 60 + 30,
  },
  busyIntervals: [{ start: at(11 * 60), end: at(11 * 60 + 30) }],
  durationMin: 30,
  now: at(0),
});

describe("isOfferedSlot (revalidação da reserva pública)", () => {
  it("aceita um horário que a disponibilidade oferece", () => {
    expect(isOfferedSlot(slots, "p1", at(9 * 60))).toBe(true);
    expect(isOfferedSlot(slots, "p1", at(10 * 60 + 30))).toBe(true);
  });

  it("recusa fora do expediente, no almoço e em bloqueio", () => {
    expect(isOfferedSlot(slots, "p1", at(3 * 60))).toBe(false);
    expect(isOfferedSlot(slots, "p1", at(10 * 60))).toBe(false);
    expect(isOfferedSlot(slots, "p1", at(11 * 60))).toBe(false);
  });

  it("recusa início fora da grade de 15 min", () => {
    expect(isOfferedSlot(slots, "p1", at(9 * 60 + 7))).toBe(false);
  });

  it("recusa o horário se for de outro profissional", () => {
    expect(isOfferedSlot(slots, "p2", at(9 * 60))).toBe(false);
  });
});
