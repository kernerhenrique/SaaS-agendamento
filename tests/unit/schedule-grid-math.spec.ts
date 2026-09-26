import { describe, expect, it } from "vitest";

import {
  clampToRange,
  computeDayRange,
  hourMarks,
  instantRangeToDayMinutes,
  minutesToHeightPx,
  minutesToTopPx,
  isWithinWorkingHours,
  pxToMinute,
  snapDeltaMinutes,
  weekDates,
} from "@/app/admin/(authenticated)/agenda/schedule-grid-math";
import { localDayRangeUtc } from "@/lib/date";

describe("instantRangeToDayMinutes", () => {
  const tz = "America/Sao_Paulo";
  const day = localDayRangeUtc("2026-09-24", tz);

  it("converte um agendamento para minutos no horário local do negócio", () => {
    // 17:45–18:05 em São Paulo = 20:45–21:05 UTC
    const result = instantRangeToDayMinutes(
      new Date("2026-09-24T20:45:00Z"),
      new Date("2026-09-24T21:05:00Z"),
      day,
      tz,
    );
    expect(result).toEqual({ startMinute: 17 * 60 + 45, endMinute: 18 * 60 + 5 });
  });

  it("um bloqueio de dia inteiro ocupa o dia todo, não vira 0 → 0", () => {
    const result = instantRangeToDayMinutes(day.start, day.end, day, tz);
    expect(result).toEqual({ startMinute: 0, endMinute: 24 * 60 });
  });

  it("recorta itens que começam no dia anterior ou terminam no seguinte", () => {
    const result = instantRangeToDayMinutes(
      new Date("2026-09-23T12:00:00Z"),
      new Date("2026-09-24T13:00:00Z"), // 10:00 local
      day,
      tz,
    );
    expect(result).toEqual({ startMinute: 0, endMinute: 10 * 60 });
  });
});

describe("clampToRange", () => {
  const range = { rangeStartMinute: 8 * 60, rangeEndMinute: 20 * 60 };

  it("recorta um intervalo aos limites da grade", () => {
    expect(clampToRange({ startMinute: 0, endMinute: 24 * 60 }, range)).toEqual({
      startMinute: 8 * 60,
      endMinute: 20 * 60,
    });
  });

  it("retorna null para intervalos totalmente fora da grade", () => {
    expect(clampToRange({ startMinute: 21 * 60, endMinute: 22 * 60 }, range)).toBeNull();
  });
});

describe("computeDayRange", () => {
  it("usa o padrão 08:00–20:00 quando não há nenhum dado", () => {
    expect(computeDayRange([], [])).toEqual({ rangeStartMinute: 8 * 60, rangeEndMinute: 20 * 60 });
  });

  it("cobre o expediente com margem, arredondado para a hora cheia", () => {
    // expediente 09:15–17:45 -> com 30min de margem: 08:45–18:15 -> arredonda para 08:00–19:00
    const range = computeDayRange([{ startMinute: 9 * 60 + 15, endMinute: 17 * 60 + 45 }], []);
    expect(range).toEqual({ rangeStartMinute: 8 * 60, rangeEndMinute: 19 * 60 });
  });

  it("expande para cobrir um agendamento fora do expediente cadastrado", () => {
    const workingHours = [{ startMinute: 9 * 60, endMinute: 18 * 60 }];
    const items = [{ startMinute: 7 * 60, endMinute: 7 * 60 + 30 }]; // encaixe manual às 07:00
    const range = computeDayRange(workingHours, items);
    expect(range.rangeStartMinute).toBeLessThanOrEqual(7 * 60);
    expect(range.rangeEndMinute).toBeGreaterThanOrEqual(18 * 60);
  });

  it("nunca ultrapassa os limites do dia (00:00–24:00)", () => {
    const range = computeDayRange([{ startMinute: 0, endMinute: 23 * 60 + 50 }], []);
    expect(range.rangeStartMinute).toBeGreaterThanOrEqual(0);
    expect(range.rangeEndMinute).toBeLessThanOrEqual(24 * 60);
  });
});

describe("minutesToTopPx / minutesToHeightPx", () => {
  const range = { rangeStartMinute: 8 * 60, rangeEndMinute: 20 * 60 };

  it("calcula a posição do topo proporcional aos minutos desde o início da grade", () => {
    expect(minutesToTopPx(8 * 60, range, 64)).toBe(0);
    expect(minutesToTopPx(9 * 60, range, 64)).toBe(64);
    expect(minutesToTopPx(8 * 60 + 30, range, 64)).toBe(32);
  });

  it("calcula a altura proporcional à duração, respeitando a altura mínima", () => {
    expect(minutesToHeightPx(9 * 60, 10 * 60, 64)).toBe(64); // 1h = 64px
    expect(minutesToHeightPx(9 * 60, 9 * 60 + 15, 64)).toBe(28); // 15min viraria 16px, usa o mínimo
  });
});

describe("hourMarks", () => {
  it("gera uma marca por hora cheia dentro do intervalo, incluindo as pontas", () => {
    const range = { rangeStartMinute: 8 * 60, rangeEndMinute: 11 * 60 };
    expect(hourMarks(range)).toEqual([8 * 60, 9 * 60, 10 * 60, 11 * 60]);
  });
});

describe("pxToMinute / snapDeltaMinutes", () => {
  const range = { rangeStartMinute: 8 * 60, rangeEndMinute: 20 * 60 };

  it("converte posição em minuto, arredondando para baixo em passos de 15", () => {
    expect(pxToMinute(0, range, 96)).toBe(8 * 60);
    expect(pxToMinute(96, range, 96)).toBe(9 * 60);
    expect(pxToMinute(96 + 30, range, 96)).toBe(9 * 60 + 15); // 18,75 min → 15
  });

  it("fica dentro da grade", () => {
    expect(pxToMinute(-50, range, 96)).toBe(8 * 60);
    expect(pxToMinute(99999, range, 96)).toBe(20 * 60 - 15);
  });

  it("deslocamento de arrasto vai para o passo mais próximo", () => {
    expect(snapDeltaMinutes(24, 96)).toBe(15); // 15 min exatos
    expect(snapDeltaMinutes(10, 96)).toBe(0); // 6,25 min → 0
    expect(snapDeltaMinutes(-40, 96)).toBe(-30); // -25 min → -30
  });
});

describe("weekDates", () => {
  it("vai de segunda a domingo, atravessando o mês", () => {
    // 2026-09-30 é quarta-feira.
    expect(weekDates("2026-09-30")).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
  });

  it("domingo pertence à semana que começou na segunda anterior", () => {
    expect(weekDates("2026-09-27")[0]).toBe("2026-09-21");
  });
});

describe("isWithinWorkingHours", () => {
  const wh = { startMinute: 9 * 60, endMinute: 18 * 60, breakStartMinute: 12 * 60, breakEndMinute: 13 * 60 };

  it("dentro do expediente e fora do almoço", () => {
    expect(isWithinWorkingHours(wh, 10 * 60, 10 * 60 + 30)).toBe(true);
    expect(isWithinWorkingHours(wh, 11 * 60 + 30, 12 * 60)).toBe(true);
  });

  it("fora do expediente, invadindo o almoço ou sem expediente", () => {
    expect(isWithinWorkingHours(wh, 8 * 60 + 30, 9 * 60)).toBe(false);
    expect(isWithinWorkingHours(wh, 17 * 60 + 45, 18 * 60 + 15)).toBe(false);
    expect(isWithinWorkingHours(wh, 11 * 60 + 45, 12 * 60 + 15)).toBe(false);
    expect(isWithinWorkingHours(null, 10 * 60, 10 * 60 + 30)).toBe(false);
  });
});
