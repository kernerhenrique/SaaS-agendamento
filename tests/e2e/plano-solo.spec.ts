import { execSync } from "node:child_process";

import { expect, test } from "@playwright/test";

/**
 * Plano Solo (limite = 1 profissional): a reserva tem 3 passos, sem a escolha do
 * profissional. O negócio de equipe (Navalha de Ouro) continua com 4 passos: ver booking-flow.spec.ts.
 */
test("plano Solo: reserva em 3 passos (Serviço, Horário, Contato) e Voltar leva ao serviço", async ({ page }) => {
  const slug = `solo-e2e-${Date.now().toString(36)}`;
  const output = execSync(`npm run novo-cliente --silent -- tests/fixtures/cliente-solo-e2e.json --slug ${slug} --json`, { encoding: "utf8" });
  expect((JSON.parse(output.trim().split("\n").at(-1)!) as { ok: boolean }).ok).toBe(true);

  await page.goto(`/${slug}`);
  const stepper = page.getByRole("list").filter({ hasText: "Contato" }).first();
  await expect(stepper).toContainText("Horário");
  await expect(stepper).not.toContainText("Profissional");

  // Escolher o serviço leva direto aos horários; o resumo já diz quem atende.
  await page.getByText("Manicure", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "Escolha data e horário" })).toBeVisible();
  await expect(page.getByText("Escolha o profissional")).toHaveCount(0);
  await expect(page.locator("div.sticky").getByText("Ana")).toBeVisible();

  // Voltar dos horários volta ao serviço (não a uma etapa vazia de profissional).
  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(page.getByRole("heading", { name: "Escolha o serviço" })).toBeVisible();

  // Reserva completa em 3 passos.
  await page.getByText("Pé e mão", { exact: true }).click();
  await page.getByRole("button", { name: "Próximo horário disponível" }).click();
  await page.locator('[data-testid="time-slot"]:not([data-unavailable])').first().click();
  await page.getByLabel("Nome").fill("Cliente Solo E2E");
  await page.getByLabel("WhatsApp").fill(`119${Date.now().toString().slice(-8)}`);
  await page.getByRole("button", { name: "Confirmar agendamento" }).click();
  await expect(page.getByRole("heading", { name: "Horário confirmado!" })).toBeVisible();
  await expect(page.getByText("Ana", { exact: true })).toBeVisible();
});

test("plano Solo: painel sem telas de equipe; o negócio de equipe continua igual", async ({ page, browser }) => {
  const suffix = Date.now().toString(36);
  const slug = `solo-painel-${suffix}`;
  const output = execSync(`npm run novo-cliente --silent -- tests/fixtures/cliente-solo-e2e.json --slug ${slug} --json`, { encoding: "utf8" });
  const { ownerInviteUrl } = JSON.parse(output.trim().split("\n").at(-1)!) as { ownerInviteUrl: string };

  // O dono cria o acesso pelo link de primeiro acesso e entra no painel.
  await page.goto(new URL(ownerInviteUrl).pathname);
  await page.getByLabel("Seu nome").fill("Ana");
  await page.getByLabel("E-mail (para entrar)").fill(`ana.${suffix}@example.com`);
  await page.getByLabel("Senha", { exact: true }).fill("senha-da-ana");
  await page.getByLabel("Confirmar senha").fill("senha-da-ana");
  await page.getByRole("button", { name: "Criar acesso e entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  // Menu: "Meu expediente" no lugar de "Profissionais", direto nos dados da Ana.
  const nav = page.getByRole("navigation").first();
  await expect(nav.getByRole("link", { name: "Profissionais" })).toHaveCount(0);
  await nav.getByRole("link", { name: "Meu expediente" }).click();
  await expect(page.getByRole("tab", { name: "Dados" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Acesso ao painel")).toHaveCount(0);
  await expect(page.getByText("Remover cadastro")).toHaveCount(0);
  await expect(page.getByText(/Comissão/)).toHaveCount(0);
  await expect(page.getByRole("switch", { name: "Ativo" })).toBeHidden();
  await expect(page.getByRole("link", { name: "Profissionais" })).toHaveCount(0);

  // Financeiro sem comissões; relatórios sem a aba de profissionais nem "mais requisitado".
  await page.goto("/admin/financeiro");
  await expect(page.getByRole("tab", { name: "Recebimentos" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Comissões" })).toHaveCount(0);
  await page.goto("/admin/relatorios");
  await expect(page.getByRole("tab", { name: "Faturamento" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Profissionais" })).toHaveCount(0);
  await expect(page.getByText(/mais requisitad/i)).toHaveCount(0);

  // Novo agendamento: a Ana já vem escolhida, sem o campo de profissional.
  await page.goto("/admin");
  await page.getByRole("button", { name: /Novo agendamento/ }).first().click();
  const dialog = page.getByRole("dialog", { name: "Novo agendamento" });
  await expect(dialog.getByLabel("Serviço")).toBeVisible();
  await expect(dialog.getByLabel("Profissional")).toBeHidden();

  // Negócio de equipe (sem limite): tudo como antes.
  const team = await browser.newContext();
  try {
    const owner = await team.newPage();
    await owner.request.post("/api/admin/auth/login", { data: { email: "dono@navalhadeouro.com", password: "senha123" } });
    await owner.goto("/admin/financeiro");
    await expect(owner.getByRole("navigation").first().getByRole("link", { name: "Barbeiros" })).toBeVisible();
    await expect(owner.getByRole("tab", { name: "Comissões" })).toBeVisible();
  } finally {
    await team.close();
  }
});
