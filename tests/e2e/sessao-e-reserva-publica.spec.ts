import { expect, test } from "@playwright/test";

import { loginAsOwner } from "./helpers";

/**
 * Parte A: a sessão renova sozinha quando o access token (15 min) some.
 * Parte B: reserva e reagendamento sem login só aceitam horários que a
 * disponibilidade oferece.
 */

test("sessão renova em silêncio sem o access token e morre de vez no logout", async ({ page, context }) => {
  await loginAsOwner(page);
  const refreshBefore = (await context.cookies()).find((c) => c.name === "refresh_token")!;

  // Simula os 15 min passando: o navegador perde o access token.
  await context.clearCookies({ name: "access_token" });
  await page.goto("/admin/agenda");
  await expect(page).toHaveURL(/\/admin\/agenda/);
  await expect(page.getByRole("heading", { name: "Agenda" })).toBeVisible();
  expect((await context.cookies()).some((c) => c.name === "access_token")).toBe(true);

  // Chamada de API também renova.
  await context.clearCookies({ name: "access_token" });
  expect((await page.request.get("/api/admin/professionals")).status()).toBe(200);

  // Logout revoga todos os refresh anteriores: o antigo não renova mais.
  expect((await page.request.post("/api/admin/auth/logout")).status()).toBe(200);
  await context.addCookies([refreshBefore]);
  await page.goto("/admin/agenda");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("reserva pública e reagendamento pelo link recusam horário fora da disponibilidade", async ({ page, request }) => {
  await loginAsOwner(page);
  const services = (await (await page.request.get("/api/admin/services")).json()).services as {
    id: string;
    name: string;
    businessId: string;
  }[];
  const professionals = (await (await page.request.get("/api/admin/professionals")).json()).professionals as {
    id: string;
    name: string;
  }[];
  const corte = services.find((s) => s.name === "Corte de cabelo")!;
  const joao = professionals.find((p) => p.name === "João Barbeiro")!;
  const phone = () => `119${Date.now().toString().slice(-8)}`;
  const book = (startAt: string) =>
    request.post("/api/public/appointments", {
      data: {
        businessId: corte.businessId,
        professionalId: joao.id,
        serviceId: corte.id,
        startAt,
        client: { name: "Reserva Pública E2E", phone: phone() },
      },
    });

  // Uma segunda-feira distante (João atende seg–sex, 09–18, almoço 12–13).
  const monday = new Date();
  monday.setUTCDate(monday.getUTCDate() + 7 * (8 + Math.floor(Math.random() * 30)));
  monday.setUTCDate(monday.getUTCDate() + ((8 - monday.getUTCDay()) % 7));
  const mondayIso = monday.toISOString().slice(0, 10);
  const sundayIso = new Date(monday.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  for (const startAt of [
    `${mondayIso}T03:00:00-03:00`, // madrugada
    `${mondayIso}T12:15:00-03:00`, // almoço
    `${mondayIso}T09:07:00-03:00`, // fora da grade
    `${sundayIso}T10:00:00-03:00`, // sem expediente
  ]) {
    const refused = await book(startAt);
    expect(refused.status(), startAt).toBe(400);
    expect((await refused.json()).error).toContain("não está mais disponível");
  }

  // Um horário oferecido de verdade é aceito.
  const availability = await (
    await request.get(
      `/api/availability?businessId=${corte.businessId}&serviceId=${corte.id}&professionalId=${joao.id}&date=${mondayIso}`,
    )
  ).json();
  const slot = availability.slots[Math.floor(Math.random() * availability.slots.length)];
  const created = await book(slot.startAt);
  expect(created.status()).toBe(201);
  const { manageToken } = (await created.json()).appointment;

  try {
    // Reagendar pelo link para a madrugada: recusado.
    const reschedule = await request.post(`/api/public/appointments/manage/${manageToken}/reschedule`, {
      data: { startAt: `${mondayIso}T03:00:00-03:00` },
    });
    expect(reschedule.status()).toBe(400);
  } finally {
    await request.post(`/api/public/appointments/manage/${manageToken}/cancel`);
  }
});
