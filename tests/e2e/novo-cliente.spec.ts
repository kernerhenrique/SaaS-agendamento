import { execSync } from "node:child_process";

import { expect, test } from "@playwright/test";

/**
 * Fase 7 (B1): `npm run novo-cliente` cria o negócio a partir do arquivo do
 * cliente e devolve o link de primeiro acesso do dono. O dono cria o próprio
 * e-mail e senha pelo link, entra com tudo de dono, e o link não serve de novo.
 * Cada execução usa um slug novo; o negócio fica no banco local (inofensivo).
 */
test("novo-cliente: negócio pronto, dono cria o acesso pelo link e a página pública abre", async ({ page, browser }) => {
  const suffix = Date.now().toString(36);
  const slug = `clinica-e2e-${suffix}`;
  const output = execSync(`npm run novo-cliente --silent -- tests/fixtures/cliente-e2e.json --slug ${slug} --json`, { encoding: "utf8" });
  const result = JSON.parse(output.trim().split("\n").at(-1)!) as { ok: boolean; publicUrl: string; ownerInviteUrl: string };
  expect(result.ok).toBe(true);
  const invitePath = new URL(result.ownerInviteUrl).pathname;
  expect(invitePath).toMatch(/^\/admin\/convite\/[\w-]{40,}$/);

  // Página do convite: texto de dono, sem nome pré-preenchido.
  await page.goto(invitePath);
  await expect(page.getByText("Crie o seu acesso de dono")).toBeVisible();
  await expect(page.getByLabel("Seu nome")).toHaveValue("");
  await page.getByLabel("Seu nome").fill("Ana Dona");
  await page.getByLabel("E-mail (para entrar)").fill(`dona.${suffix}@example.com`);
  await page.getByLabel("Senha", { exact: true }).fill("senha-da-dona");
  await page.getByLabel("Confirmar senha").fill("senha-da-dona");
  await page.getByRole("button", { name: "Criar acesso e entrar" }).click();

  // Entra no painel do negócio novo, como dono (Configurações e Financeiro liberados).
  await expect(page).toHaveURL(/\/admin$/);
  const business = (await (await page.request.get("/api/admin/business")).json()).business as { name: string; slug: string; businessType: string; accentColor: string };
  expect(business).toMatchObject({ name: "Clínica Pele Leve", slug, businessType: "beauty_clinic", accentColor: "#7C3AED" });
  expect((await page.request.get("/api/admin/finance/summary")).status()).not.toBe(403);
  const professionals = (await (await page.request.get("/api/admin/professionals")).json()).professionals as { name: string }[];
  expect(professionals.map((p) => p.name).sort()).toEqual(["Bia", "Dra. Ana"]);

  // O link é de uso único: abrir de novo mostra a mensagem genérica.
  const guest = await browser.newContext();
  try {
    const reused = await guest.request.get(`/api/public/staff-invite/${invitePath.split("/").at(-1)}`);
    expect(reused.status()).toBe(404);
  } finally {
    await guest.close();
  }

  // Página pública com o catálogo do nicho e os termos de estética.
  await page.goto(`/${slug}`);
  await expect(page.getByRole("heading", { name: "Clínica Pele Leve" })).toBeVisible();
  await expect(page.getByText("Limpeza de pele")).toBeVisible();
});
