import { describe, expect, it } from "vitest";

import { checkAdminReschedule, type AdminRescheduleCheck } from "@/server/modules/appointment/reschedule-rules";

const base: AdminRescheduleCheck = {
  status: "CONFIRMED",
  professionalActive: true,
  professionalOffersService: true,
  newStartAt: new Date("2026-09-28T13:00:00Z"),
  newEndAt: new Date("2026-09-28T13:30:00Z"),
  blocks: [],
};

describe("checkAdminReschedule", () => {
  it("aceita remarcação válida", () => {
    expect(checkAdminReschedule(base)).toBeNull();
  });

  it("recusa status final (concluído, faltou, cancelado)", () => {
    for (const status of ["COMPLETED", "NO_SHOW", "CANCELLED"] as const) {
      expect(checkAdminReschedule({ ...base, status })).toMatch(/pendentes ou confirmados/);
    }
    expect(checkAdminReschedule({ ...base, status: "PENDING" })).toBeNull();
  });

  it("recusa profissional inativo ou que não faz o serviço", () => {
    expect(checkAdminReschedule({ ...base, professionalActive: false })).toMatch(/inativo/);
    expect(checkAdminReschedule({ ...base, professionalOffersService: false })).toMatch(/não realiza/);
  });

  it("recusa quando cai em bloqueio, inclusive sobreposição parcial", () => {
    const block = { startAt: new Date("2026-09-28T13:15:00Z"), endAt: new Date("2026-09-28T14:00:00Z") };
    expect(checkAdminReschedule({ ...base, blocks: [block] })).toMatch(/bloqueado/);
  });

  it("aceita horário encostado no bloqueio (fim = início)", () => {
    const block = { startAt: new Date("2026-09-28T13:30:00Z"), endAt: new Date("2026-09-28T14:00:00Z") };
    expect(checkAdminReschedule({ ...base, blocks: [block] })).toBeNull();
  });
});
