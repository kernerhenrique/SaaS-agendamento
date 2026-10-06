import { describe, expect, it } from "vitest";

import { comparisonRanges, parsePeriodPreset, previousRange, resolvePeriod } from "@/lib/period";

const TODAY = "2026-09-27";

describe("resolvePeriod (Financeiro)", () => {
  it("hoje e últimos 7 dias (incluindo hoje)", () => {
    expect(resolvePeriod("hoje", TODAY)).toEqual({ startDate: TODAY, endDate: TODAY });
    expect(resolvePeriod("7-dias", TODAY)).toEqual({ startDate: "2026-09-21", endDate: TODAY });
  });

  it("este mês e mês passado, inclusive virada de ano", () => {
    expect(resolvePeriod("mes", TODAY)).toEqual({ startDate: "2026-09-01", endDate: "2026-09-30" });
    expect(resolvePeriod("mes-passado", TODAY)).toEqual({ startDate: "2026-08-01", endDate: "2026-08-31" });
    expect(resolvePeriod("mes-passado", "2026-01-10")).toEqual({ startDate: "2025-12-01", endDate: "2025-12-31" });
  });

  it("personalizado válido é usado; inválido cai no mês atual", () => {
    expect(resolvePeriod("personalizado", TODAY, { startDate: "2026-09-10", endDate: "2026-09-15" })).toEqual({
      startDate: "2026-09-10",
      endDate: "2026-09-15",
    });
    expect(resolvePeriod("personalizado", TODAY, { startDate: "2026-09-15", endDate: "2026-09-10" })).toEqual({
      startDate: "2026-09-01",
      endDate: "2026-09-30",
    });
    expect(resolvePeriod("personalizado", TODAY, { startDate: "lixo", endDate: null }).startDate).toBe("2026-09-01");
  });

  it("período anterior tem o mesmo tamanho e termina na véspera do início", () => {
    expect(previousRange("2026-09-27", "2026-09-27")).toEqual({ startDate: "2026-09-26", endDate: "2026-09-26" });
    expect(previousRange("2026-09-21", "2026-09-27")).toEqual({ startDate: "2026-09-14", endDate: "2026-09-20" });
    // Setembro (30 dias) compara com os 30 dias anteriores, atravessando a virada de mês.
    expect(previousRange("2026-09-01", "2026-09-30")).toEqual({ startDate: "2026-08-02", endDate: "2026-08-31" });
  });

  it("preset desconhecido na URL vira 'este mês'", () => {
    expect(parsePeriodPreset("ontem")).toBe("mes");
    expect(parsePeriodPreset("7-dias")).toBe("7-dias");
  });
});

describe("comparisonRanges (vs. período anterior nos Relatórios)", () => {
  it("este mês no dia 6: compara 1 a 6 com 1 a 6 do mês anterior", () => {
    expect(comparisonRanges({ startDate: "2026-10-01", endDate: "2026-10-31" }, "2026-10-06")).toEqual({
      current: { startDate: "2026-10-01", endDate: "2026-10-06" },
      previous: { startDate: "2026-09-01", endDate: "2026-09-06" },
      cut: true,
    });
  });

  it("dia 31 compara com o último dia de um mês de 30", () => {
    expect(comparisonRanges({ startDate: "2026-10-01", endDate: "2026-10-31" }, "2026-10-30").previous).toEqual({
      startDate: "2026-09-01",
      endDate: "2026-09-30",
    });
  });

  it("mês passado inteiro compara com o mês anterior inteiro", () => {
    expect(comparisonRanges({ startDate: "2026-09-01", endDate: "2026-09-30" }, "2026-10-06")).toEqual({
      current: { startDate: "2026-09-01", endDate: "2026-09-30" },
      previous: { startDate: "2026-08-01", endDate: "2026-08-31" },
      cut: false,
    });
  });

  it("intervalo livre: anterior de mesmo tamanho, cortado em hoje", () => {
    expect(comparisonRanges({ startDate: "2026-09-30", endDate: "2026-10-06" }, "2026-10-06").previous).toEqual({
      startDate: "2026-09-23",
      endDate: "2026-09-29",
    });
    expect(comparisonRanges({ startDate: "2026-10-01", endDate: "2026-10-10" }, "2026-10-03")).toEqual({
      current: { startDate: "2026-10-01", endDate: "2026-10-03" },
      previous: { startDate: "2026-09-28", endDate: "2026-09-30" },
      cut: true,
    });
  });
});
