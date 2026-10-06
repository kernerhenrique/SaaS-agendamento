import { expect, test, type Page } from "@playwright/test";

/**
 * Cobre o fluxo público completo (serviço → profissional → horário →
 * contato → confirmação) contra os dados do seed (prisma/seed.ts). Depende
 * de um servidor rodando com o banco populado — veja README.md.
 */
/** `slotIndex`: testes em paralelo escolhem horários diferentes (senão disputam o mesmo). */
async function bookUntilContact(page: Page, slotIndex = 0) {
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
  // Espera cada dia terminar de carregar (grade ou estado vazio) antes de
  // decidir: sem isso, num dia fechado o laço passava pelos dias sem esperar.
  const dayLoaded = timeSlot.or(page.getByText(/Nenhum horário disponível|Todos os horários deste dia|Fechado neste dia/));
  // Começa amanhã: um horário de hoje pode cair dentro do prazo para cancelar
  // (2 h no seed) e o link não mostraria cancelar/remarcar.
  await dayLoaded.first().waitFor();
  await dateChips.nth(1).click();
  for (let dayIndex = 1; dayIndex < 21; dayIndex++) {
    await dayLoaded.first().waitFor();
    if (await timeSlot.isVisible().catch(() => false)) break;
    await dateChips.nth(dayIndex + 1).click();
  }
  await expect(timeSlot).toBeVisible();
  const freeSlots = page.locator('[data-testid="time-slot"]:not([data-unavailable])');
  await freeSlots.nth(Math.min(slotIndex, (await freeSlots.count()) - 1)).click();

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
  await expect(page.getByRole("link", { name: "Adicionar ao calendário" })).toBeVisible();
  // A aba leva o nome do negócio, não o da plataforma.
  await expect(page).toHaveTitle(/Barbearia Navalha de Ouro/);
  await expect(page.getByRole("button", { name: "Confirmar presença" })).toHaveCount(0);

  // Remarcar: o toque só escolhe; muda de verdade depois de confirmar.
  const reschedule = page.getByRole("region", { name: "Precisa de outro horário?" });
  await reschedule.getByRole("button", { name: "Remarcar" }).click();
  const nextDay = reschedule.getByRole("button", { name: "Próximo dia" });
  const slot = reschedule.locator("button.min-h-11").first();
  const dayLoaded = slot.or(reschedule.getByText("Nenhum horário disponível neste dia."));
  // A partir de amanhã: remarcar para daqui a pouco cairia no prazo de cancelamento (2 h no seed).
  await dayLoaded.first().waitFor();
  await nextDay.click();
  for (let i = 0; i < 14; i++) {
    await dayLoaded.first().waitFor();
    if (await slot.isVisible().catch(() => false)) break;
    await nextDay.click();
  }
  await slot.click();
  await expect(reschedule.getByText(/Remarcar para/)).toBeVisible();
  await reschedule.getByRole("button", { name: "Confirmar remarcação" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Horário alterado para" })).toBeVisible();

  // Cancelar: modal do sistema (não a caixinha do navegador) e depois "Reservar outro horário".
  await page.getByRole("region", { name: "Não vai poder ir?" }).getByRole("button", { name: "Cancelar agendamento" }).click();
  const confirm = page.getByRole("dialog", { name: "Cancelar este agendamento?" });
  await confirm.getByRole("button", { name: "Sim, cancelar" }).click();
  await expect(page.getByRole("heading", { name: "Agendamento cancelado" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Reservar outro horário" })).toHaveAttribute("href", "/navalha-de-ouro");
});

test("serviço que ninguém faz fica fora da página; o resumo mostra quem atende e o preço “a partir de”", async ({ page }) => {
  await page.goto("/navalha-de-ouro");
  // "Coloração" (seed) não tem nenhum barbeiro: não aparece para o cliente.
  await expect(page.getByText("Corte de cabelo", { exact: true })).toBeVisible();
  await expect(page.getByText("Coloração", { exact: true })).toHaveCount(0);

  // Barba: dois barbeiros, então há "Sem preferência" com explicação.
  await page.getByRole("button").filter({ hasText: "Barba feita na navalha" }).click();
  await expect(page.getByText("Mostramos os horários de todos.", { exact: false })).toBeVisible();
  await page.getByText("Sem preferência", { exact: true }).click();
  const timeSlot = page.locator('[data-testid="time-slot"]:not([data-unavailable])').first();
  await page.getByRole("button", { name: "Próximo horário disponível" }).click();
  await timeSlot.click();
  // Com o horário escolhido, o resumo já diz quem atende (não "Sem preferência").
  const summary = page.locator("div.sticky");
  await expect(summary.getByText("Sem preferência")).toHaveCount(0);
  await expect(summary.getByText(/João Barbeiro|Marcos Estilista/)).toBeVisible();
});

test("sem e-mail, a confirmação não promete e-mail e pede para guardar o link", async ({ page }) => {
  await bookUntilContact(page, 4);
  await page.getByRole("button", { name: "Confirmar agendamento" }).click();

  await expect(page.getByRole("heading", { name: "Horário confirmado!" })).toBeVisible();
  await expect(page.getByText(/Guarde o link abaixo/)).toBeVisible();
  await expect(page.getByText(/Enviamos/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Copiar link" })).toBeVisible();
});
