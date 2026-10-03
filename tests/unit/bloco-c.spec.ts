import { describe, expect, it } from "vitest";

import { PASSWORD_RESET_TTL_MINUTES, resetPasswordProblem } from "@/server/modules/auth/password-rules";
import { alertRecipients } from "@/server/modules/notification/business-alerts";

describe("senha nova pela recuperação", () => {
  it("exige pelo menos 8 caracteres e respeita o limite do bcrypt", () => {
    expect(resetPasswordProblem("curta")).toMatch(/pelo menos 8/);
    expect(resetPasswordProblem("senha-boa-123")).toBeNull();
    expect(resetPasswordProblem("á".repeat(40))).toMatch(/longa demais/); // 80 bytes em UTF-8
  });

  it("link por e-mail é curto; o do suporte dura um dia", () => {
    expect(PASSWORD_RESET_TTL_MINUTES.email).toBe(60);
    expect(PASSWORD_RESET_TTL_MINUTES.support).toBe(24 * 60);
  });
});

describe("aviso de reserva ao negócio: destinatários", () => {
  const users = [
    { email: "dono@x.com", role: "OWNER", professionalId: null },
    { email: "socia@x.com", role: "OWNER", professionalId: null },
    { email: "joao@x.com", role: "PROFESSIONAL", professionalId: "joao" },
    { email: "marcos@x.com", role: "PROFESSIONAL", professionalId: "marcos" },
    { email: "demo-x@demo.aprazzo.invalid", role: "OWNER", professionalId: null },
  ];

  it("donos e só o profissional do atendimento, sem e-mails fictícios", () => {
    expect(alertRecipients(users, "joao")).toEqual(["dono@x.com", "socia@x.com", "joao@x.com"]);
  });

  it("profissional sem acesso ao painel: só os donos", () => {
    expect(alertRecipients(users, "ana")).toEqual(["dono@x.com", "socia@x.com"]);
  });
});
