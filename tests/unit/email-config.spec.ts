import { describe, expect, it } from "vitest";

import { pickReplyTo } from "@/server/modules/appointment/confirmation-email";
import { resolveMailConfig } from "@/server/modules/notification/email";

describe("resolveMailConfig", () => {
  it("sem credenciais não envia (só loga)", () => {
    expect(resolveMailConfig({})).toBeNull();
    expect(resolveMailConfig({ SMTP_HOST: "smtp.hostinger.com", SMTP_USER: "x@aprazzo.com.br" })).toBeNull();
  });

  it("SMTP do domínio: porta 465 com TLS direto e o remetente de EMAIL_FROM", () => {
    const config = resolveMailConfig({
      SMTP_HOST: "smtp.hostinger.com",
      SMTP_PORT: "465",
      SMTP_USER: "nao-responda@aprazzo.com.br",
      SMTP_PASS: "segredo",
      EMAIL_FROM: "nao-responda@aprazzo.com.br",
    });
    expect(config).toEqual({
      transport: { host: "smtp.hostinger.com", port: 465, secure: true, auth: { user: "nao-responda@aprazzo.com.br", pass: "segredo" } },
      fromAddress: "nao-responda@aprazzo.com.br",
    });
  });

  it("porta 587 usa STARTTLS; sem porta assume 465; sem EMAIL_FROM usa o usuário", () => {
    const starttls = resolveMailConfig({ SMTP_HOST: "h", SMTP_PORT: "587", SMTP_USER: "u@d.com", SMTP_PASS: "p" });
    expect(starttls?.transport).toMatchObject({ port: 587, secure: false });
    const noPort = resolveMailConfig({ SMTP_HOST: "h", SMTP_USER: "u@d.com", SMTP_PASS: "p" });
    expect(noPort?.transport).toMatchObject({ port: 465, secure: true });
    expect(noPort?.fromAddress).toBe("u@d.com");
  });

  it("SMTP tem prioridade sobre o Gmail, que continua aceito sozinho", () => {
    const both = resolveMailConfig({ SMTP_HOST: "h", SMTP_USER: "u@d.com", SMTP_PASS: "p", GMAIL_USER: "g@gmail.com", GMAIL_APP_PASSWORD: "x" });
    expect(both?.fromAddress).toBe("u@d.com");
    const gmail = resolveMailConfig({ GMAIL_USER: "g@gmail.com", GMAIL_APP_PASSWORD: "x" });
    expect(gmail).toEqual({ transport: { service: "gmail", auth: { user: "g@gmail.com", pass: "x" } }, fromAddress: "g@gmail.com" });
  });
});

describe("pickReplyTo", () => {
  it("primeiro dono ativo com e-mail real", () => {
    expect(
      pickReplyTo([
        { email: "visitante@demo.invalid", disabledAt: null },
        { email: "antigo@x.com", disabledAt: new Date() },
        { email: "dono@x.com", disabledAt: null },
        { email: "socio@x.com", disabledAt: null },
      ]),
    ).toBe("dono@x.com");
    expect(pickReplyTo([])).toBeUndefined();
  });
});
