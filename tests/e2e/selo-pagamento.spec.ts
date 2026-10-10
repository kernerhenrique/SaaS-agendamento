import { expect, test } from "@playwright/test";

import { findFreeSlot, loginAsOwner } from "./helpers";

/**
 * Selo de pagamento na agenda (sugestão do dono do produto): um sinal pago num
 * agendamento futuro aparece como "Parcial" ao lado do nome do cliente, na grade
 * do computador e na lista do celular; sem nada pago, o futuro não mostra selo.
 */
test("sinal pago aparece como Parcial ao lado do nome na agenda (computador e celular)", async ({ page, browser }) => {
  await loginAsOwner(page);
  const api = page.request;
  const services = (await (await api.get("/api/admin/services")).json()).services as {
    id: string;
    businessId: string;
    professionalServices: { professional: { id: string; name: string; active: boolean } }[];
  }[];
  const service = services.find((s) => s.professionalServices.some((ps) => ps.professional.active))!;
  const professional = service.professionalServices.find((ps) => ps.professional.active)!.professional;
  const professionalId = professional.id;
  const slot = await findFreeSlot(api, { businessId: service.businessId, serviceId: service.id, professionalId, weekday: 3 });

  const create = (name: string, startAt: string) =>
    api.post("/api/admin/appointments", {
      data: { professionalId, serviceId: service.id, startAt, client: { name, phone: `119${Date.now().toString().slice(-8)}` } },
    });
  const withSinal = `Sinal E2E ${Date.now()}`;
  const created = await create(withSinal, slot.startAt);
  expect(created.status()).toBe(201);
  const appointmentId = (await created.json()).appointment.id as string;
  const sinal = await api.post(`/api/admin/appointments/${appointmentId}/payments`, {
    data: { amountCents: 1000, method: "PIX", receivedAt: new Date().toISOString(), note: "Sinal" },
  });
  expect(sinal.status()).toBe(201);

  // A lista da agenda já traz o status: parcial no futuro com sinal.
  const list = (await (await api.get(`/api/admin/appointments?startDate=${slot.date}&endDate=${slot.date}`)).json()).appointments as {
    id: string;
    paymentStatus: string | null;
  }[];
  expect(list.find((a) => a.id === appointmentId)?.paymentStatus).toBe("PARTIAL");

  try {
    // Computador: o selo fica no cartão, junto do nome.
    await page.goto(`/admin/agenda?date=${slot.date}`);
    const card = page.getByRole("button", { name: new RegExp(withSinal) });
    await expect(card.getByLabel("Pagamento parcial")).toBeVisible();

    // Celular: na lista do dia, também ao lado do nome.
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await page.context().storageState() });
    const mobile = await phone.newPage();
    await mobile.goto(`/admin/agenda?date=${slot.date}`);
    // Equipe: com mais de uma agenda no dia, a lista abre na aba do primeiro; vai para a de quem atende.
    // As abas mostram só o primeiro nome ("Marcos 1").
    const tab = mobile.getByRole("tab", { name: new RegExp(`^${professional.name.split(" ")[0]}`) });
    if (await tab.isVisible()) await tab.click();
    const row = mobile.getByRole("button", { name: new RegExp(withSinal) }).filter({ visible: true }).first();
    await expect(row.getByText("Parcial", { exact: true })).toBeVisible();
    await phone.close();
  } finally {
    await api.patch(`/api/admin/appointments/${appointmentId}/status`, { data: { status: "CANCELLED" } });
  }
});
