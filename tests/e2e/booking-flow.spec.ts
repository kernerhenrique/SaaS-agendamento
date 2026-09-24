import { expect, test } from "@playwright/test";

/**
 * Cobre o fluxo público completo (serviço → profissional → horário →
 * contato → confirmação) contra os dados do seed (prisma/seed.ts). Depende
 * de um servidor rodando com o banco populado — veja README.md.
 */
test("cliente consegue agendar um horário do início ao fim", async ({ page }) => {
  await page.goto("/navalha-de-ouro");

  await expect(page.getByRole("heading", { name: "Escolha o serviço" })).toBeVisible();
  await page.getByText("Corte de cabelo", { exact: true }).click();

  await expect(page.getByRole("heading", { name: "Escolha o profissional" })).toBeVisible();
  await page.getByText("João Barbeiro", { exact: true }).click();

  await expect(page.getByRole("heading", { name: "Escolha data e horário" })).toBeVisible();

  // Avança dia a dia até encontrar um horário livre — evita depender de uma
  // data fixa (que ficaria inválida com o tempo ou colidiria com bloqueios
  // manuais/feriados do seed).
  const timeSlot = page.getByTestId("time-slot").first();
  for (let attempt = 0; attempt < 21; attempt++) {
    if (await timeSlot.isVisible().catch(() => false)) break;
    await page.getByLabel("Próximo dia").click();
  }
  await expect(timeSlot).toBeVisible();
  await timeSlot.click();

  await expect(page.getByRole("heading", { name: "Seus dados" })).toBeVisible();
  const uniquePhone = `119${Date.now().toString().slice(-8)}`;
  await page.getByLabel("Nome").fill("Cliente Teste E2E");
  await page.getByLabel("Telefone").fill(uniquePhone);
  await page.getByLabel("E-mail").fill("cliente.e2e@example.com");
  await page.getByRole("button", { name: "Confirmar agendamento" }).click();

  await expect(page.getByRole("heading", { name: "Agendamento confirmado!" })).toBeVisible();
  await expect(page.getByText("Corte de cabelo")).toBeVisible();
  await expect(page.getByText("João Barbeiro")).toBeVisible();
  await expect(page.getByRole("link", { name: "Adicionar ao calendário (.ics)" })).toBeVisible();
});
