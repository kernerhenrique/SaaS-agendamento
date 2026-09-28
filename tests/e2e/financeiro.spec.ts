import { expect, test } from "@playwright/test";

import { loginAsOwner } from "./helpers";

/** Bloco 4C: tela Financeiro (recebimentos, filtros, a receber → drawer, comissões). */
test("financeiro mostra recebimentos do dia, filtra, recebe o que falta e lista comissões", async ({ page }) => {
  await loginAsOwner(page);
  const api = page.request;
  const professionals = (await (await api.get("/api/admin/professionals")).json()).professionals as {
    id: string;
    name: string;
  }[];
  const services = (await (await api.get("/api/admin/services")).json()).services as { id: string; name: string }[];
  const joao = professionals.find((p) => p.name === "João Barbeiro")!;
  const barba = services.find((s) => s.name === "Barba")!;

  // Dois atendimentos numa segunda distante: um pago no Débito hoje, outro concluído sem pagamento.
  const monday = new Date();
  monday.setUTCDate(monday.getUTCDate() + 7 * (10 + Math.floor(Math.random() * 30)));
  monday.setUTCDate(monday.getUTCDate() + ((8 - monday.getUTCDay()) % 7));
  const isoDate = monday.toISOString().slice(0, 10);
  const base = 9 * 60 + 30 * Math.floor(Math.random() * 4);
  const stamp = Date.now();
  const create = async (minute: number, name: string) => {
    const hhmm = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
    const response = await api.post("/api/admin/appointments", {
      data: {
        professionalId: joao.id,
        serviceId: barba.id,
        startAt: `${isoDate}T${hhmm}:00-03:00`,
        client: { name, phone: `119${String(stamp + minute).slice(-8)}` },
      },
    });
    expect(response.status()).toBe(201);
    return (await response.json()).appointment.id as string;
  };
  const paidName = `Fin Pago ${stamp}`;
  const openName = `Fin Aberto ${stamp}`;
  const paidId = await create(base, paidName);
  const openId = await create(base + 30, openName);
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

  // A receber → Receber abre o drawer; registrar tira da lista.
  await page.getByRole("tab", { name: /A receber/ }).click();
  const row = page.getByRole("listitem").filter({ hasText: openName });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Receber" }).click();
  const drawer = page.getByRole("dialog", { name: barba.name });
  await drawer.getByRole("button", { name: "Registrar pagamento" }).click();
  await drawer.getByRole("button", { name: "Registrar pagamento" }).last().click();
  await expect(page.getByText("Pagamento registrado.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listitem").filter({ hasText: openName })).toHaveCount(0);

  // Comissões do período com total.
  await page.getByRole("tab", { name: "Comissões" }).click();
  await expect(page.getByRole("cell", { name: "Total" })).toBeVisible();
  await expect(page.getByRole("link", { name: "João Barbeiro" })).toBeVisible();
  await expect(page).toHaveURL(/aba=comissoes/);
});
