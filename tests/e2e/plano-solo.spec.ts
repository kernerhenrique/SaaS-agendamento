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
