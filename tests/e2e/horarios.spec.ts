import { expect, test } from "@playwright/test";

import { localDateInDays, loginAsOwner } from "./helpers";

/**
 * Horários (Bloco E3): o expediente cabe no horário do negócio (a tela mostra o
 * do negócio ao lado de cada dia e o servidor recusa o que passa) e as folgas
 * de uma pessoa entram por período, num cartão à parte do formulário.
 */
test("expediente fora do horário do negócio é avisado e recusado; folga por período", async ({ page }) => {
  await loginAsOwner(page);
  const professionals = (await (await page.request.get("/api/admin/professionals")).json()).professionals as { id: string; name: string }[];
  const marcos = professionals.find((p) => p.name === "Marcos Estilista")!;

  await page.goto(`/admin/profissionais/${marcos.id}`);
  await page.getByRole("tab", { name: "Dados" }).click();

  // Sábado: o negócio fecha às 17:00. Esticar até 19:00 destaca o dia e o salvar recusa.
  await expect(page.getByText("Negócio: 09:00 às 17:00")).toBeVisible();
  await page.getByLabel("Sábado: fim", { exact: true }).fill("19:00");
  await expect(page.getByText("· fora do horário")).toBeVisible();
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "passa do horário de funcionamento" })).toBeVisible();
  await page.getByLabel("Sábado: fim", { exact: true }).fill("17:00");
  await expect(page.getByText("· fora do horário")).toHaveCount(0);

  // Folga de vários dias, gravada na hora (sem o "Salvar" do cadastro).
  const card = page.getByRole("region", { name: `Folgas e ausências de ${marcos.name}` });
  await expect(card.getByRole("link", { name: "Use Dias fechados" })).toHaveAttribute("href", "/admin/configuracoes#fechados");
  const start = localDateInDays(40);
  const end = localDateInDays(44);
  await card.getByLabel("De", { exact: true }).fill(start);
  await card.getByLabel("Até (opcional)", { exact: true }).fill(end);
  await card.getByLabel("Motivo (opcional)", { exact: true }).fill("Férias E2E");
  await card.getByRole("button", { name: "Adicionar ausência" }).click();
  const label = `${start.slice(8, 10)}/${start.slice(5, 7)} a ${end.slice(8, 10)}/${end.slice(5, 7)} · dias inteiros`;
  const item = card.getByRole("listitem").filter({ hasText: "Férias E2E" });
  await expect(item).toContainText(label);

  // Só algumas horas de um dia.
  await card.getByRole("radio", { name: "Só algumas horas" }).click();
  await card.getByLabel("Data", { exact: true }).fill(localDateInDays(41));
  await card.getByLabel("Das", { exact: true }).fill("14:00");
  await card.getByLabel("Às", { exact: true }).fill("16:00");
  await card.getByLabel("Motivo (opcional)", { exact: true }).fill("Médico E2E");
  await card.getByRole("button", { name: "Adicionar ausência" }).click();
  await expect(card.getByRole("listitem").filter({ hasText: "Médico E2E" })).toContainText("14:00 às 16:00");

  // Limpa o banco local.
  for (const reason of ["Férias E2E", "Médico E2E"]) {
    await card.getByRole("listitem").filter({ hasText: reason }).getByRole("button", { name: /Remover ausência/ }).click();
    await expect(card.getByRole("listitem").filter({ hasText: reason })).toHaveCount(0);
  }
});
