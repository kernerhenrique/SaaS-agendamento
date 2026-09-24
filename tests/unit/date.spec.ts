import { describe, expect, it } from "vitest";

import { Weekday } from "@/generated/prisma/enums";
import { localDayRangeUtc, localMinutesToUtc, weekdayOfLocalDate } from "@/lib/date";

describe("localMinutesToUtc", () => {
  it("converte horário local para UTC usando o offset fixo do timezone (São Paulo, sem DST)", () => {
    // 09:00 em America/Sao_Paulo (UTC-03:00, fixo desde 2019) = 12:00 UTC
    const result = localMinutesToUtc("2026-09-24", 9 * 60, "America/Sao_Paulo");
    expect(result.toISOString()).toBe("2026-09-24T12:00:00.000Z");
  });

  it("respeita a virada de horário de verão (spring forward) em vez de usar offset fixo", () => {
    // Nos EUA, em 2026 o DST começa em 8/mar às 2h (relógios avançam para 3h).
    // 01:00 local ainda é EST (UTC-05:00) -> 06:00 UTC.
    const beforeTransition = localMinutesToUtc("2026-03-08", 1 * 60, "America/New_York");
    expect(beforeTransition.toISOString()).toBe("2026-03-08T06:00:00.000Z");

    // 03:00 local já é EDT (UTC-04:00) -> 07:00 UTC. Se o código usasse um
    // offset fixo, o resultado estaria errado em 1 hora.
    const afterTransition = localMinutesToUtc("2026-03-08", 3 * 60, "America/New_York");
    expect(afterTransition.toISOString()).toBe("2026-03-08T07:00:00.000Z");
  });

  it("respeita a virada de horário de verão (fall back)", () => {
    // Em 2026 o DST termina em 1/nov às 2h (relógios voltam para 1h).
    // 00:30 local ainda é EDT (UTC-04:00) -> 04:30 UTC.
    const beforeTransition = localMinutesToUtc("2026-11-01", 0 * 60 + 30, "America/New_York");
    expect(beforeTransition.toISOString()).toBe("2026-11-01T04:30:00.000Z");

    // 03:30 local já é EST (UTC-05:00) -> 08:30 UTC.
    const afterTransition = localMinutesToUtc("2026-11-01", 3 * 60 + 30, "America/New_York");
    expect(afterTransition.toISOString()).toBe("2026-11-01T08:30:00.000Z");
  });
});

describe("localDayRangeUtc", () => {
  it("retorna os instantes UTC de 00:00 e 00:00 do dia seguinte no timezone local", () => {
    const { start, end } = localDayRangeUtc("2026-09-24", "America/Sao_Paulo");
    expect(start.toISOString()).toBe("2026-09-24T03:00:00.000Z");
    expect(end.toISOString()).toBe("2026-09-25T03:00:00.000Z");
  });
});

describe("weekdayOfLocalDate", () => {
  it("calcula o dia da semana no timezone do negócio, não no timezone do servidor", () => {
    // 2026-09-24 é uma quinta-feira.
    expect(weekdayOfLocalDate("2026-09-24", "America/Sao_Paulo")).toBe(Weekday.THURSDAY);
  });

  it("usa o timezone informado para decidir o dia, mesmo perto da virada de data em UTC", () => {
    // 2026-09-24T00:30 em Sao Paulo (UTC-03:00) corresponde a 2026-09-24T03:30Z,
    // então a data local "2026-09-24" continua sendo quinta-feira.
    expect(weekdayOfLocalDate("2026-09-24", "America/Sao_Paulo")).toBe(Weekday.THURSDAY);
    expect(weekdayOfLocalDate("2026-09-25", "America/Sao_Paulo")).toBe(Weekday.FRIDAY);
  });
});
