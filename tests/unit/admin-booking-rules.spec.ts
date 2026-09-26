import { describe, expect, it } from "vitest";

import {
  OUTSIDE_WORKING_HOURS,
  PAST_MESSAGE,
  checkAdminBookingTime,
  isInPast,
  workingHoursProblem,
} from "@/server/modules/appointment/admin-booking-rules";

const MINUTE = 60_000;
const TZ = "America/Sao_Paulo";
// Segunda 09:00–18:00 com almoço 12:00–13:00; sem expediente nos outros dias.
const MONDAY = { weekday: "MONDAY" as const, startMinute: 540, endMinute: 1080, breakStartMinute: 720, breakEndMinute: 780 };

function check(startAtIso: string, overrides: Partial<Parameters<typeof checkAdminBookingTime>[0]> = {}) {
  return checkAdminBookingTime({
    startAt: new Date(startAtIso),
    durationMin: 30,
    now: new Date("2026-09-26T12:00:00-03:00"),
    timeZone: TZ,
    weeklyHours: [MONDAY],
    allowOutsideHours: false,
    ...overrides,
  });
}

describe("isInPast", () => {
  const now = new Date("2026-09-26T14:00:00Z");

  it("aceita até 15 min atrás (encaixe que acabou de começar)", () => {
    expect(isInPast(new Date(now.getTime() - 14 * MINUTE), now)).toBe(false);
    expect(isInPast(new Date(now.getTime() - 15 * MINUTE), now)).toBe(false);
  });

  it("recusa mais de 15 min atrás", () => {
    expect(isInPast(new Date(now.getTime() - 16 * MINUTE), now)).toBe(true);
  });

  it("futuro nunca é passado", () => {
    expect(isInPast(new Date(now.getTime() + MINUTE), now)).toBe(false);
  });
});

describe("workingHoursProblem", () => {
  it("dia sem expediente", () => {
    expect(workingHoursProblem(null, 600, 630)).toBe("Sem expediente neste dia");
  });

  it("antes do início, depois do fim e no almoço ficam fora", () => {
    expect(workingHoursProblem(MONDAY, 510, 540)).toMatch(/Fora do expediente/);
    expect(workingHoursProblem(MONDAY, 1065, 1095)).toMatch(/Fora do expediente/);
    expect(workingHoursProblem(MONDAY, 705, 735)).toMatch(/Fora do expediente/);
  });

  it("dentro do expediente, encostando nas bordas", () => {
    expect(workingHoursProblem(MONDAY, 540, 570)).toBeNull();
    expect(workingHoursProblem(MONDAY, 690, 720)).toBeNull();
    expect(workingHoursProblem(MONDAY, 780, 810)).toBeNull();
    expect(workingHoursProblem(MONDAY, 1050, 1080)).toBeNull();
  });
});

describe("checkAdminBookingTime", () => {
  it("segunda às 10:00 (horário de Brasília) passa", () => {
    expect(check("2026-09-28T10:00:00-03:00")).toBeNull();
  });

  it("usa o fuso do negócio: 10:00 local é 13:00 UTC, não 10:00", () => {
    // 07:30 local (10:30 UTC) está fora, mesmo 10:30 UTC parecendo "dentro".
    expect(check("2026-09-28T10:30:00Z")?.code).toBe(OUTSIDE_WORKING_HOURS);
    expect(check("2026-09-28T13:00:00Z")).toBeNull();
  });

  it("domingo sem expediente pede confirmação", () => {
    const result = check("2026-09-27T10:00:00-03:00");
    expect(result).toEqual({ message: "Sem expediente neste dia", code: OUTSIDE_WORKING_HOURS });
  });

  it("allowOutsideHours libera fora do expediente", () => {
    expect(check("2026-09-27T10:00:00-03:00", { allowOutsideHours: true })).toBeNull();
  });

  it("passado é recusado mesmo com allowOutsideHours, e sem code", () => {
    const result = check("2026-09-25T10:00:00-03:00", { allowOutsideHours: true });
    expect(result).toEqual({ message: PAST_MESSAGE });
  });
});
