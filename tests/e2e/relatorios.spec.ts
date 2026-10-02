import { expect, test } from "@playwright/test";

import { loginAsOwner } from "./helpers";

/** Bloco 5B: tela de Relatórios com período, comparação, cinco abas e exportação. */
test("relatórios mostram as cinco abas com comparação e o menu de exportação", async ({ page }) => {
  await loginAsOwner(page);
  await page.goto("/admin/relatorios?periodo=mes");
  await expect(page.getByRole("heading", { name: "Relatórios" })).toBeVisible();

  // Atendimentos: KPIs com a linha de comparação.
  await expect(page.getByText("Taxa de faltas")).toBeVisible();
  await expect(page.getByText(/período anterior/).first()).toBeVisible();

  // Faturamento: gráfico de recebido por dia.
  await page.getByRole("tab", { name: "Faturamento" }).click();
  await expect(page).toHaveURL(/aba=faturamento/);
  await expect(page.getByText("Ticket médio")).toBeVisible();
  await expect(page.getByText("Recebido por dia")).toBeVisible();

  // Profissionais (termo do preset): tabela comparativa.
  await page.getByRole("tab", { name: "Barbeiros" }).click();
  await expect(page.getByRole("columnheader", { name: "Ocupação" })).toBeVisible();
  await expect(page.getByRole("link", { name: "João Barbeiro" })).toBeVisible();

  // Serviços: alternar receita/quantidade.
  await page.getByRole("tab", { name: "Serviços" }).click();
  await page.getByRole("radio", { name: "Por quantidade" }).click();
  await expect(page.getByText("Agendamentos por serviço")).toBeVisible();

  // Clientes: novos x que voltaram e ranking com link para a ficha.
  await page.getByRole("tab", { name: "Clientes" }).click();
  await expect(page.getByText("Quem mais gastou no período")).toBeVisible();
  // Qualquer cliente do mês (um nome fixo do seed some quando o mês vira).
  await expect(page.locator('a[href*="/admin/clientes?cliente="]').first()).toBeVisible();

  // Exportar: menu com as duas planilhas e download do CSV de recebimentos.
  await page.getByRole("button", { name: "Exportar CSV" }).click();
  await expect(page.getByRole("menuitem", { name: "Fechamento de comissões" })).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Recebimentos do período" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^recebimentos-\d{4}-\d{2}-\d{2}-a-\d{4}-\d{2}-\d{2}\.csv$/);

  // Período personalizado vai para a URL.
  await page.getByRole("combobox", { name: "Período" }).click();
  await page.getByRole("option", { name: "Personalizado" }).click();
  await expect(page.getByLabel("De", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/periodo=personalizado.*inicio=/);
});
