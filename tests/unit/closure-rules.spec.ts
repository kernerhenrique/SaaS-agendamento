import { describe, expect, it } from "vitest";

import {
  brazilianHolidays,
  easterSunday,
  findClosure,
  parseClosureInput,
  upcomingHolidays,
} from "@/server/modules/business/closure-rules";

describe("dias fechados", () => {
  const closures = [
    { startDate: "2026-12-24", endDate: "2026-12-26", reason: "Natal" },
    { startDate: "2027-01-01", endDate: "2027-01-01", reason: "Ano-novo" },
  ];

  it("acha o fechamento que cobre a data, com início e fim inclusivos", () => {
    expect(findClosure("2026-12-24", closures)?.reason).toBe("Natal");
    expect(findClosure("2026-12-26", closures)?.reason).toBe("Natal");
    expect(findClosure("2027-01-01", closures)?.reason).toBe("Ano-novo");
    expect(findClosure("2026-12-27", closures)).toBeNull();
    expect(findClosure("2026-12-23", closures)).toBeNull();
  });

  it("valida o formulário: um dia só, período, datas inválidas e motivo", () => {
    expect(parseClosureInput({ startDate: "2026-12-25", reason: " Natal " })).toEqual({ startDate: "2026-12-25", endDate: "2026-12-25", reason: "Natal" });
    expect(parseClosureInput({ startDate: "2027-01-10", endDate: "2027-01-24", reason: "Férias" }).endDate).toBe("2027-01-24");
    expect(() => parseClosureInput({ startDate: "2026-02-30", reason: "x" })).toThrow(/data/);
    expect(() => parseClosureInput({ startDate: "2026-12-25", endDate: "2026-12-20", reason: "x" })).toThrow(/depois/);
    expect(() => parseClosureInput({ startDate: "2026-01-01", endDate: "2027-06-01", reason: "x" })).toThrow(/1 ano/);
    expect(() => parseClosureInput({ startDate: "2026-12-25", reason: "  " })).toThrow(/motivo/);
  });
});

describe("feriados nacionais", () => {
  it("calcula a Páscoa (e os feriados que dependem dela)", () => {
    expect(easterSunday(2026)).toBe("2026-04-05");
    expect(easterSunday(2027)).toBe("2027-03-28");
    expect(easterSunday(2028)).toBe("2028-04-16");
    const h2026 = Object.fromEntries(brazilianHolidays(2026).map((h) => [h.name, h.date]));
    expect(h2026["Carnaval (segunda)"]).toBe("2026-02-16");
    expect(h2026["Carnaval (terça)"]).toBe("2026-02-17");
    expect(h2026["Sexta-feira Santa"]).toBe("2026-04-03");
    expect(h2026["Corpus Christi"]).toBe("2026-06-04");
    const h2027 = Object.fromEntries(brazilianHolidays(2027).map((h) => [h.name, h.date]));
    expect(h2027["Carnaval (terça)"]).toBe("2027-02-09");
    expect(h2027["Corpus Christi"]).toBe("2027-05-27");
  });

  it("feriados fixos e pontos facultativos marcados", () => {
    const list = brazilianHolidays(2026);
    expect(list.find((h) => h.date === "2026-11-20")?.name).toBe("Dia da Consciência Negra");
    expect(list.find((h) => h.date === "2026-12-25")?.optional).toBe(false);
    expect(list.filter((h) => h.optional).map((h) => h.name)).toEqual(["Carnaval (segunda)", "Carnaval (terça)", "Corpus Christi"]);
  });

  it("próximos 12 meses atravessam a virada do ano, em ordem", () => {
    const upcoming = upcomingHolidays("2026-10-04");
    expect(upcoming[0]).toMatchObject({ date: "2026-10-12", name: "Nossa Senhora Aparecida" });
    expect(upcoming.some((h) => h.date === "2027-01-01")).toBe(true);
    expect(upcoming.at(-1)!.date <= "2027-10-04").toBe(true);
    expect(upcoming.map((h) => h.date)).toEqual([...upcoming.map((h) => h.date)].sort());
  });
});
