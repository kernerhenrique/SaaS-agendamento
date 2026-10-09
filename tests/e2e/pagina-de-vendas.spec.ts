import { expect, test } from "@playwright/test";

/** Página de vendas (aprazzo.com.br): chamadas, demonstração, abas, dúvidas e entrada do painel. */
test("página de vendas: WhatsApp, demonstração, abas pelo teclado, dúvidas e Entrar", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Seu cliente marca sozinho. Você só atende.");

  // Toda chamada principal abre o WhatsApp de vendas com a mensagem pronta, em nova aba.
  const cta = page.getByRole("link", { name: "Conhecer a Aprazzo pelo WhatsApp" }).first();
  await expect(cta).toHaveAttribute("href", /^https:\/\/wa\.me\/55\d{10,11}\?text=Ol%C3%A1/);
  await expect(cta).toHaveAttribute("target", "_blank");
  await expect(page.getByRole("link", { name: "Entrar" }).first()).toHaveAttribute("href", "/admin/login");

  // Demonstração: serviço → horário → revisar → confirmar; o atendimento entra na agenda.
  const demo = page.locator("#como-funciona");
  await demo.getByRole("button", { name: /Corte \+ barba/ }).click();
  await demo.getByRole("button", { name: "Escolher horário" }).click();
  await expect(demo.getByRole("button", { name: "09:00, indisponível" })).toBeDisabled();
  await demo.getByRole("button", { name: "14:30" }).click();
  await demo.getByRole("button", { name: "Revisar" }).click();
  await demo.getByRole("button", { name: "Confirmar agendamento" }).click();
  await expect(demo.getByText("Novo agendamento na agenda: 14:30, Corte + barba.")).toBeVisible();
  await expect(demo.getByText("Confirmação pronta para enviar no WhatsApp")).toBeVisible();
  await demo.getByRole("button", { name: "Refazer a demonstração" }).click();
  await expect(demo.getByText("Qual serviço?")).toBeVisible();

  // Abas: setas trocam de aba e o painel acompanha.
  await page.getByRole("tab", { name: "Agenda" }).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "WhatsApp" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText("Menos faltas com lembrete no WhatsApp");

  // Tipos de negócio: a página de exemplo muda.
  await page.getByRole("radio", { name: "Clínica ou consultório" }).click();
  await expect(page.getByText("Clínica Exemplo")).toBeVisible();

  // Dúvidas: abre a resposta.
  await page.getByText("Preciso configurar tudo sozinho?").click();
  await expect(page.getByText(/Nós configuramos seus serviços/)).toBeVisible();

  // Rodapé: termos e privacidade.
  await expect(page.getByRole("link", { name: "Termos de uso" })).toHaveAttribute("href", "/termos");
  await expect(page.getByRole("link", { name: "Política de privacidade" })).toHaveAttribute("href", "/privacidade");
});
