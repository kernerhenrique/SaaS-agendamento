import { describe, expect, it } from "vitest";

import { buildMonthGrid, shiftYearMonth, yearMonthOf } from "@/app/[slug]/month-grid";

describe("buildMonthGrid", () => {
  it("alinha o dia 1 no dia da semana correto (setembro/2026 começa numa terça)", () => {
    const weeks = buildMonthGrid("2026-09");
    expect(weeks[0]).toEqual([null, null, "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05"]);
  });

  it("inclui todos os dias do mês e completa a última semana com null", () => {
    const weeks = buildMonthGrid("2026-09");
    const days = weeks.flat().filter(Boolean);
    expect(days).toHaveLength(30);
    expect(days.at(-1)).toBe("2026-09-30");
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks.at(-1)).toEqual(["2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", null, null, null]);
  });

  it("trata fevereiro de ano bissexto", () => {
    expect(buildMonthGrid("2028-02").flat().filter(Boolean)).toHaveLength(29);
  });
});

describe("shiftYearMonth / yearMonthOf", () => {
  it("atravessa a virada de ano nos dois sentidos", () => {
    expect(shiftYearMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftYearMonth("2026-01", -1)).toBe("2025-12");
  });

  it("extrai o mês de uma data", () => {
    expect(yearMonthOf("2026-09-24")).toBe("2026-09");
  });
});
