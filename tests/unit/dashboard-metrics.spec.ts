import { describe, expect, it } from "vitest";

import {
  availableMinutes,
  computeNoShowRate,
  computeOccupancyRate,
  datesInRange,
  isLate,
  monthRange,
  workingWindows,
} from "@/server/modules/dashboard/metrics";

const TZ = "America/Sao_Paulo";

describe("monthRange / datesInRange", () => {
  it("cobre o mês inteiro, inclusive fevereiro de ano bissexto", () => {
    expect(monthRange("2026-09-24")).toEqual({ startDate: "2026-09-01", endDate: "2026-09-30" });
    expect(monthRange("2028-02-10")).toEqual({ startDate: "2028-02-01", endDate: "2028-02-29" });
    expect(datesInRange("2026-09-29", "2026-10-02")).toEqual(["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]);
  });
});

describe("expediente disponível", () => {
  // 2026-09-24 é quinta-feira.
  const thursday = [
    { weekday: "THURSDAY" as const, startMinute: 9 * 60, endMinute: 18 * 60, breakStartMinute: 12 * 60, breakEndMinute: 13 * 60 },
  ];

  it("desconta o intervalo de almoço e ignora dias sem expediente", () => {
    const windows = workingWindows(thursday, ["2026-09-24", "2026-09-25"], TZ);
    expect(availableMinutes(windows, [])).toBe(8 * 60);
  });

  it("desconta bloqueios que caem dentro do expediente", () => {
    const windows = workingWindows(thursday, ["2026-09-24"], TZ);
    // Bloqueio 10:00–11:30 local (UTC-3).
    const block = { startAt: new Date("2026-09-24T13:00:00Z"), endAt: new Date("2026-09-24T14:30:00Z") };
    expect(availableMinutes(windows, [block])).toBe(8 * 60 - 90);
  });

  it("bloqueio de dia inteiro zera o dia", () => {
    const windows = workingWindows(thursday, ["2026-09-24"], TZ);
    const block = { startAt: new Date("2026-09-24T03:00:00Z"), endAt: new Date("2026-09-25T03:00:00Z") };
    expect(availableMinutes(windows, [block])).toBe(0);
  });
});

describe("taxas", () => {
  const now = new Date("2026-09-24T15:00:00Z");

  it("ocupação limitada a 100% e nula sem expediente", () => {
    expect(computeOccupancyRate(240, 480)).toBe(0.5);
    expect(computeOccupancyRate(600, 480)).toBe(1);
    expect(computeOccupancyRate(10, 0)).toBeNull();
  });

  it("faltas só entre atendimentos passados e não cancelados", () => {
    const past = new Date("2026-09-20T12:00:00Z");
    const future = new Date("2026-09-30T12:00:00Z");
    const rate = computeNoShowRate(
      [
        { status: "NO_SHOW", startAt: past },
        { status: "COMPLETED", startAt: past },
        { status: "CANCELLED", startAt: past },
        { status: "CONFIRMED", startAt: future },
      ],
      now,
    );
    expect(rate).toBe(0.5);
    expect(computeNoShowRate([{ status: "CONFIRMED", startAt: future }], now)).toBeNull();
  });

  it("atrasado = aberto e com início já passado", () => {
    expect(isLate({ status: "CONFIRMED", startAt: new Date("2026-09-24T14:00:00Z") }, now)).toBe(true);
    expect(isLate({ status: "COMPLETED", startAt: new Date("2026-09-24T14:00:00Z") }, now)).toBe(false);
    expect(isLate({ status: "PENDING", startAt: new Date("2026-09-24T16:00:00Z") }, now)).toBe(false);
  });
});
