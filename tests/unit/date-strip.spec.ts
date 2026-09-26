import { describe, expect, it } from "vitest";

import { buildDateStripDays } from "@/components/date-strip";

describe("buildDateStripDays", () => {
  it("gera a quantidade pedida de dias consecutivos a partir da data mínima, inclusive", () => {
    expect(buildDateStripDays("2026-09-24", 5)).toEqual([
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
      "2026-09-27",
      "2026-09-28",
    ]);
  });

  it("atravessa a virada de mês corretamente", () => {
    const days = buildDateStripDays("2026-09-29", 4);
    expect(days).toEqual(["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]);
  });

  it("retorna lista vazia quando days é 0", () => {
    expect(buildDateStripDays("2026-09-24", 0)).toEqual([]);
  });
});
