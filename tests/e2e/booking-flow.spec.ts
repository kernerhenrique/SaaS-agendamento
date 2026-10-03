import { expect, test, type Page } from "@playwright/test";

/**
 * Cobre o fluxo público completo (serviço → profissional → horário →
 * contato → confirmação) contra os dados do seed (prisma/seed.ts). Depende
 * de um servidor rodando com o banco populado — veja README.md.
 */
async function bookUntilContact(page: Page) {
  await page.goto("/navalha-de-ouro");

  await expect(page.getByRole("heading", { name: "Escolha o serviço" })).toBeVisible();
  await page.getByText("Corte de cabelo", { exact: true }).click();

  await expect(page.getByRole("heading", { name: "Escolha o barbeiro" })).toBeVisible();
  await expect(page.getByText("Especialidade:").first()).toBeVisible();
  await page.getByText("João Barbeiro", { exact: true }).click();

  await expect(page.getByRole("heading", { name: "Escolha data e horário" })).toBeVisible();

  // Avança dia a dia na faixa horizontal até encontrar um horário livre —
  // evita depender de uma data fixa (que ficaria inválida com o tempo ou
  // colidiria com bloqueios manuais/feriados do seed).
  const dateChips = page.getByTestId("date-strip-day");
  // Só horários livres: os ocupados também aparecem na grade, desabilitados.
  const timeSlot = page.locator('[data-testid="time-slot"]:not([data-unavailable])').first();
  for (let dayIndex = 0; dayIndex < 21; dayIndex++) {
    if (await timeSlot.isVisible().catch(() => false)) break;
    await dateChips.nth(dayIndex).click();
  }
  await expect(timeSlot).toBeVisible();
  await timeSlot.click();

  await expect(page.getByRole("heading", { name: "Seus dados" })).toBeVisible();
  await page.getByLabel("Nome").fill("Cliente Teste E2E");
  await page.getByLabel("WhatsApp").fill(`119${Date.now().toString().slice(-8)}`);
}

test("cliente agenda, já fica confirmado e o link mostra cancelar (vermelho) e remarcar (amarelo)", async ({ page }) => {
  await bookUntilContact(page);
  await page.getByLabel("E-mail").fill("cliente.e2e@example.com");
  await page.getByRole("button", { name: "Confirmar agendamento" }).click();

  await expect(page.getByRole("heading", { name: "Horário confirmado!" })).toBeVisible();
  await expect(page.getByText("cliente.e2e@example.com")).toBeVisible();
  await expect(page.getByText("Corte de cabelo")).toBeVisible();
  await expect(page.getByText("João Barbeiro")).toBeVisible();
  await expect(page.getByRole("link", { name: "Adicionar ao calendário (.ics)" })).toBeVisible();

  // Link do agendamento em destaque, com "Salvar no meu WhatsApp" levando o próprio link.
  const linkSection = page.getByRole("region", { name: "Seu link do agendamento" });
  await expect(linkSection).toBeVisible();
  const saveHref = await linkSection.getByRole("link", { name: "Salvar no meu WhatsApp" }).getAttribute("href");
  expect(saveHref).toMatch(/^https:\/\/wa\.me\/\?text=/);
  expect(decodeURIComponent(saveHref!)).toMatch(/\/agendamento\/[\w-]+\/gerenciar/);

  // O link: reserva já confirmada; o que dá para fazer é cancelar ou remarcar.
  await page.getByRole("link", { name: "Abrir meu agendamento" }).click();
  await expect(page.getByRole("heading", { name: "Seu agendamento" })).toBeVisible();
  await expect(page.getByText("Confirmado", { exact: true })).toBeVisible();
  await expect(page.getByText(/Use esta página se precisar cancelar ou remarcar/)).toBeVisible();
  await expect(page.getByRole("region", { name: "Não vai poder ir?" }).getByRole("button", { name: "Cancelar agendamento" })).toBeVisible();
  await page.getByRole("region", { name: "Precisa de outro horário?" }).getByRole("button", { name: "Remarcar" }).click();
  await expect(page.getByRole("button", { name: "Fechar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmar presença" })).toHaveCount(0);
});

test("sem e-mail, a confirmação não promete e-mail e pede para guardar o link", async ({ page }) => {
  await bookUntilContact(page);
  await page.getByRole("button", { name: "Confirmar agendamento" }).click();

  await expect(page.getByRole("heading", { name: "Horário confirmado!" })).toBeVisible();
  await expect(page.getByText(/Guarde o link abaixo/)).toBeVisible();
  await expect(page.getByText(/Enviamos/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Copiar link" })).toBeVisible();
});
