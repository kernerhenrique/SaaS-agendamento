import { expect, test } from "@playwright/test";

import { findFreeSlot, loginAsOwner } from "./helpers";

/**
 * Bloco 4D: o financeiro aparece no Início (KPIs + alerta de concluído sem
 * pagamento), na ficha do cliente (total gasto) e no perfil do profissional.
 */
test("início, ficha do cliente e perfil do profissional mostram o financeiro", async ({ page }) => {
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
  const marcos = professionals.find((p) => p.name === "Marcos Estilista")!;
  const barba = services.find((s) => s.name === "Barba")!;

  // Horário livre numa terça (Marcos atende ter–sáb), concluído SEM pagamento.
  const slot = await findFreeSlot(api, {
    businessId: barba.businessId,
    serviceId: barba.id,
    professionalId: marcos.id,
    weekday: 2,
  });
  const phone = `119${Date.now().toString().slice(-8)}`;
  const clientName = `Integra E2E ${Date.now()}`;
  const created = await api.post("/api/admin/appointments", {
    data: {
      professionalId: marcos.id,
      serviceId: barba.id,
      startAt: slot.startAt,
      client: { name: clientName, phone },
    },
  });
  expect(created.status()).toBe(201);
  const appointmentId = (await created.json()).appointment.id as string;
  expect((await api.post(`/api/admin/appointments/${appointmentId}/complete`, { data: {} })).status()).toBe(200);

  // Início: KPIs financeiros e o alerta que leva ao A receber.
  await page.goto("/admin");
  await expect(page.getByText("Recebido no mês")).toBeVisible();
  await expect(page.getByText(/A receber \(\d+\)/)).toBeVisible();
  const alert = page.getByRole("link", { name: /sem nenhum pagamento/ });
  await expect(alert).toBeVisible();
  await alert.click();
  await expect(page).toHaveURL(/\/admin\/financeiro\?.*aba=a-receber/);
  await expect(page.getByRole("listitem").filter({ hasText: clientName })).toBeVisible();

  // Recebe R$ 35 e confere o total gasto na ficha.
  const paid = await api.post(`/api/admin/appointments/${appointmentId}/payments`, {
    data: { amountCents: 3500, method: "PIX", receivedAt: new Date().toISOString() },
  });
  expect(paid.status()).toBe(201);
  const client = (await (await api.get(`/api/admin/clients/lookup?phone=${phone}`)).json()).client;
  await page.goto(`/admin/clientes?q=${encodeURIComponent(clientName)}&cliente=${client.id}`);
  const drawer = page.getByRole("dialog", { name: clientName });
  await expect(drawer.getByText("Total gasto")).toBeVisible();
  await expect(drawer.getByText("R$ 35,00")).toBeVisible();

  // Perfil do Marcos: recebido e comissão do mês na aba Desempenho.
  await page.goto(`/admin/profissionais/${marcos.id}`);
  await page.getByRole("tab", { name: "Desempenho" }).click();
  await expect(page.getByText("Recebido no mês")).toBeVisible();
  await expect(page.getByText(/Comissão do mês/)).toBeVisible();
});
