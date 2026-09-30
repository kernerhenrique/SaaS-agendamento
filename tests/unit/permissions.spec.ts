import { describe, expect, it } from "vitest";

import { isAccessBlocked } from "@/server/modules/auth/auth.service";
import { can, canActOnAppointment, professionalScope, type Access, type Permission } from "@/server/modules/auth/permissions";
import {
  generateInviteToken,
  hashInviteToken,
  inviteExpiresAt,
  inviteState,
  parseInviteAcceptance,
} from "@/server/modules/staff/staff-invite-rules";

const owner: Access = { userId: "u1", businessId: "b1", role: "OWNER", professionalId: null };
const joao: Access = { userId: "u2", businessId: "b1", role: "PROFESSIONAL", professionalId: "pro-joao" };

const ALL: Permission[] = [
  "finance.view",
  "reports.view",
  "settings.manage",
  "catalog.manage",
  "staff.manage",
  "templates.manage",
  "payment.delete",
  "payment.discount",
  "appointment.manageAny",
];

describe("can", () => {
  it("dono pode tudo", () => {
    expect(ALL.every((permission) => can("OWNER", permission))).toBe(true);
  });

  it("profissional não tem nenhuma permissão de dono (decisão: só a própria agenda, sem desconto)", () => {
    expect(ALL.filter((permission) => can("PROFESSIONAL", permission))).toEqual([]);
  });
});

describe("canActOnAppointment / professionalScope", () => {
  it("dono age em qualquer agendamento e não tem filtro", () => {
    expect(canActOnAppointment(owner, { professionalId: "pro-marcos" })).toBe(true);
    expect(professionalScope(owner)).toEqual({});
  });

  it("profissional só nos próprios, e o filtro é o cadastro dele", () => {
    expect(canActOnAppointment(joao, { professionalId: "pro-joao" })).toBe(true);
    expect(canActOnAppointment(joao, { professionalId: "pro-marcos" })).toBe(false);
    expect(professionalScope(joao)).toEqual({ professionalId: "pro-joao" });
  });

  it("profissional sem cadastro vinculado não enxerga nada", () => {
    const orphan: Access = { ...joao, professionalId: null };
    expect(canActOnAppointment(orphan, { professionalId: "pro-joao" })).toBe(false);
    expect(professionalScope(orphan).professionalId).not.toBe(undefined);
  });
});

describe("isAccessBlocked", () => {
  const base = { role: "PROFESSIONAL" as const, disabledAt: null, professionalId: "pro-joao", professional: { deletedAt: null } };

  it("bloqueia acesso revogado e profissional com cadastro removido", () => {
    expect(isAccessBlocked(base)).toBe(false);
    expect(isAccessBlocked({ ...base, disabledAt: new Date() })).toBe(true);
    expect(isAccessBlocked({ ...base, professional: { deletedAt: new Date() } })).toBe(true);
    expect(isAccessBlocked({ ...base, professionalId: null, professional: null })).toBe(true);
  });

  it("dono sem cadastro de profissional entra normalmente", () => {
    expect(isAccessBlocked({ role: "OWNER", disabledAt: null, professionalId: null, professional: null })).toBe(false);
  });
});

describe("convite", () => {
  it("token aleatório e só o hash vai para o banco", () => {
    const token = generateInviteToken();
    expect(token).toMatch(/^[\w-]{40,}$/);
    expect(generateInviteToken()).not.toBe(token);
    expect(hashInviteToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashInviteToken(token)).toBe(hashInviteToken(token));
    expect(hashInviteToken(token)).not.toContain(token);
  });

  it("vale 7 dias e só uma vez", () => {
    const now = new Date("2026-09-30T12:00:00Z");
    const expiresAt = inviteExpiresAt(now);
    expect(expiresAt.toISOString()).toBe("2026-10-07T12:00:00.000Z");
    expect(inviteState({ expiresAt, usedAt: null }, now)).toBe("valid");
    expect(inviteState({ expiresAt, usedAt: null }, expiresAt)).toBe("expired");
    expect(inviteState({ expiresAt, usedAt: now }, now)).toBe("used");
  });

  it("aceite normaliza o e-mail e valida nome e senha", () => {
    expect(parseInviteAcceptance({ name: " João ", email: " Joao@Exemplo.com ", password: "senha-forte" })).toEqual({
      name: "João",
      email: "joao@exemplo.com",
      password: "senha-forte",
    });
    expect(() => parseInviteAcceptance({ name: "", email: "a@b.com", password: "senha-forte" })).toThrow("nome");
    expect(() => parseInviteAcceptance({ name: "João", email: "joao", password: "senha-forte" })).toThrow("e-mail");
    expect(() => parseInviteAcceptance({ name: "João", email: "a@b.com", password: "curta" })).toThrow("8 caracteres");
  });
});
