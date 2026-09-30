import { expect, test } from "@playwright/test";

import { loginAsOwner } from "./helpers";

/**
 * Vários usuários, bloco A: o dono convida um profissional por link, o
 * profissional aceita (cria e-mail e senha) e entra; revogar derruba o acesso.
 * No fim o acesso fica revogado de novo (estado neutro para a próxima execução).
 */
test("convite de acesso: gerar, aceitar uma vez, entrar e revogar", async ({ page, browser }) => {
  await loginAsOwner(page);
  const owner = page.request;
  const professionals = (await (await owner.get("/api/admin/professionals")).json()).professionals as { id: string; name: string }[];
  const marcos = professionals.find((p) => p.name === "Marcos Estilista")!;
  const email = "marcos.e2e@example.com";
  const password = "senha-do-marcos";

  // Estado inicial neutro: sem acesso ativo.
  await owner.delete(`/api/admin/staff/${marcos.id}`);
  expect(["none", "revoked"]).toContain((await (await owner.get(`/api/admin/staff/${marcos.id}`)).json()).access.status);

  // Gerar convite: link com token; a situação vira "convite enviado".
  const created = await owner.post(`/api/admin/staff/${marcos.id}/invite`);
  expect(created.status()).toBe(201);
  const { url } = (await created.json()).invite as { url: string };
  const token = url.split("/admin/convite/")[1];
  expect(token).toMatch(/^[\w-]{40,}$/);
  expect((await (await owner.get(`/api/admin/staff/${marcos.id}`)).json()).access.status).toBe("invited");

  // Outra pessoa, sem sessão, abre o convite.
  const guest = await browser.newContext();
  try {
    const summary = await guest.request.get(`/api/public/staff-invite/${token}`);
    expect(summary.status()).toBe(200);
    expect((await summary.json()).invite).toEqual({
      businessName: expect.any(String),
      professionalName: "Marcos Estilista",
      professionalTerm: "Barbeiro",
    });

    // Senha curta recusada (o convite continua válido); depois aceita e já entra.
    expect((await guest.request.post(`/api/public/staff-invite/${token}`, { data: { name: "Marcos", email, password: "curta" } })).status()).toBe(400);
    const accepted = await guest.request.post(`/api/public/staff-invite/${token}`, {
      data: { name: "Marcos", email: "Marcos.E2E@Example.com", password },
    });
    expect(accepted.status()).toBe(201);
    const me = (await (await guest.request.get("/api/admin/auth/me")).json()).user;
    expect(me).toMatchObject({ email, role: "PROFESSIONAL", professionalId: marcos.id });

    // O link só vale uma vez; token inventado dá a mesma resposta genérica.
    expect((await guest.request.get(`/api/public/staff-invite/${token}`)).status()).toBe(404);
    expect((await guest.request.get(`/api/public/staff-invite/token-inventado-${"x".repeat(40)}`)).status()).toBe(404);
    expect((await (await owner.get(`/api/admin/staff/${marcos.id}`)).json()).access).toMatchObject({ status: "active", user: { email } });

    // Login com o e-mail em qualquer caixa funciona.
    const other = await browser.newContext();
    expect((await other.request.post("/api/admin/auth/login", { data: { email: "MARCOS.e2e@example.com", password } })).status()).toBe(200);
    await other.close();
  } finally {
    // Revogar: não entra mais e a sessão não renova.
    expect((await owner.delete(`/api/admin/staff/${marcos.id}`)).status()).toBe(200);
    expect((await guest.request.post("/api/admin/auth/login", { data: { email, password } })).status()).toBe(401);
    await guest.clearCookies({ name: "access_token" });
    expect((await guest.request.get("/api/admin/professionals")).status()).toBe(401);
    await guest.close();
  }
});
