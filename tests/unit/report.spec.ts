import { describe, expect, it } from "vitest";

import { countByLocalDay } from "@/server/modules/report/report.service";

describe("countByLocalDay", () => {
  const tz = "America/Sao_Paulo";

  it("gera um item por dia do período, com zero nos dias sem agendamento", () => {
    const result = countByLocalDay([], "2026-09-22", "2026-09-24", tz);
    expect(result).toEqual([
      { date: "2026-09-22", count: 0 },
      { date: "2026-09-23", count: 0 },
      { date: "2026-09-24", count: 0 },
    ]);
  });

  it("agrupa pela data local do negócio, não pela data UTC", () => {
    // 23:30 em São Paulo no dia 22 = 02:30 UTC do dia 23
    const lateNight = new Date("2026-09-23T02:30:00Z");
    const morning = new Date("2026-09-23T12:00:00Z"); // 09:00 do dia 23
    const result = countByLocalDay([lateNight, morning], "2026-09-22", "2026-09-23", tz);
    expect(result).toEqual([
      { date: "2026-09-22", count: 1 },
      { date: "2026-09-23", count: 1 },
    ]);
  });

  it("atravessa a virada de mês", () => {
    const result = countByLocalDay([], "2026-09-30", "2026-10-01", tz);
    expect(result.map((d) => d.date)).toEqual(["2026-09-30", "2026-10-01"]);
  });
});
