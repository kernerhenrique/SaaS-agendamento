import { expect, test } from "@playwright/test";

import { moveToPast } from "./db";
import { findFreeSlot, loginAsOwner } from "./helpers";

/** Bloco 4C: tela Financeiro (recebimentos, filtros, a receber → drawer, comissões). */
test("financeiro mostra recebimentos do dia, filtra, recebe o que falta e lista comissões", async ({ page }) => {
  await loginAsOwner(page);
  const api = page.request;
  const professionals = (await (await api.get("/api/admin/professionals")).json()).professionals as {
    id: string;
    name: string;
  }[];
  const services = (await (await api.get("/api/admin/services")).json()).services as {
    id: string;
    name: string;
    businessId: string;
  }[];
  const joao = professionals.find((p) => p.name === "João Barbeiro")!;
  const barba = services.find((s) => s.name === "Barba")!;

  // Dois atendimentos em horários livres (quarta): um pago no Débito hoje, outro concluído sem pagamento.
  const stamp = Date.now();
  const create = async (name: string, offset: number) => {
    const slot = await findFreeSlot(api, {
      businessId: barba.businessId,
      serviceId: barba.id,
      professionalId: joao.id,
      weekday: 3,
    });
    const response = await api.post("/api/admin/appointments", {
      data: {
        professionalId: joao.id,
        serviceId: barba.id,
        startAt: slot.startAt,
        client: { name, phone: `119${String(stamp + offset).slice(-8)}` },
      },
    });
    expect(response.status()).toBe(201);
    const id = (await response.json()).appointment.id as string;
    await moveToPast(id); // concluir só depois do início
    return id;
  };
  const paidName = `Fin Pago ${stamp}`;
  const openName = `Fin Aberto ${stamp}`;
  const paidId = await create(paidName, 1);
  const openId = await create(openName, 2);
  const now = new Date().toISOString();
  await api.post(`/api/admin/appointments/${paidId}/complete`, {
    data: { payment: { amountCents: 3500, method: "DEBIT_CARD", receivedAt: now } },
  });
  await api.post(`/api/admin/appointments/${openId}/complete`, { data: {} });

  await page.goto("/admin/financeiro?periodo=hoje");
  await expect(page.getByRole("heading", { name: "Financeiro" })).toBeVisible();
  await expect(page.getByText("Recebido no período")).toBeVisible();
  const table = page.getByRole("table");
  await expect(table.getByText(paidName)).toBeVisible();

  // Filtro por forma: Débito mantém; PIX esconde.
  await page.getByRole("combobox", { name: "Forma de pagamento" }).click();
  await page.getByRole("option", { name: "PIX" }).click();
  await expect(table.getByText(paidName)).toBeHidden();
  await page.getByRole("combobox", { name: "Forma de pagamento" }).click();
  await page.getByRole("option", { name: "Débito" }).click();
  await expect(table.getByText(paidName)).toBeVisible();

  // A receber → Receber abre o drawer já com o formulário; registrar tira da lista.
  await page.getByRole("tab", { name: /A receber/ }).click();
  const row = page.getByRole("listitem").filter({ hasText: openName });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Receber" }).click();
  const drawer = page.getByRole("dialog", { name: barba.name });
  await expect(drawer.getByLabel("Recebido agora")).toBeVisible();
  await drawer.getByRole("button", { name: /^Recebeu tudo/ }).click();
  await drawer.getByRole("button", { name: "Registrar pagamento" }).click();
  await expect(page.getByText("Pagamento registrado.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listitem").filter({ hasText: openName })).toHaveCount(0);

  // Comissões do período com total.
  await page.getByRole("tab", { name: "Comissões" }).click();
  await expect(page.getByRole("cell", { name: "Total" })).toBeVisible();
  await expect(page.getByRole("link", { name: "João Barbeiro" })).toBeVisible();
  await expect(page).toHaveURL(/aba=comissoes/);
});
