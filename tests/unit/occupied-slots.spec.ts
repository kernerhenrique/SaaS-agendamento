import { describe, expect, it } from "vitest";

import { occupiedStartTimes } from "@/server/modules/appointment/occupied-slots";

const at = (hhmm: string) => ({ startAt: new Date(`2026-10-05T${hhmm}:00-03:00`) });

describe("occupiedStartTimes (horários ocupados para exibir desabilitados)", () => {
  it("ocupado = está na grade do expediente mas não entre os livres", () => {
    const candidates = [at("09:00"), at("09:15"), at("09:30"), at("09:45")];
    const free = [at("09:00"), at("09:45")];
    expect(occupiedStartTimes(candidates, free)).toEqual([at("09:15").startAt.toISOString(), at("09:30").startAt.toISOString()]);
  });

  it("sem preferência: horário livre com qualquer profissional não é ocupado, e não repete", () => {
    // Dois profissionais com o mesmo horário na grade; um deles livre às 10:00.
    const candidates = [at("10:00"), at("10:00"), at("10:15"), at("10:15")];
    const free = [at("10:00")];
    expect(occupiedStartTimes(candidates, free)).toEqual([at("10:15").startAt.toISOString()]);
  });

  it("dia todo livre ou sem expediente: nada ocupado", () => {
    expect(occupiedStartTimes([at("09:00")], [at("09:00")])).toEqual([]);
    expect(occupiedStartTimes([], [])).toEqual([]);
  });
});
