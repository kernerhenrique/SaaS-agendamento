import { expect, test } from "@playwright/test";

import { loginAsOwner, weekdayInWeeks } from "./helpers";

/**
 * Página pública: horários ocupados aparecem desabilitados (não somem) e o
 * primeiro livre ganha o selo "Mais próximo". A reserva continua aceitando só
 * horários livres (a grade de ocupados é só exibição).
 */
test("horário reservado passa a ocupado na grade e volta a livre ao cancelar", async ({ page, request }) => {
  await loginAsOwner(page);
  const services = (await (await page.request.get("/api/admin/services")).json()).services as { id: string; name: string; businessId: string }[];
  const professionals = (await (await page.request.get("/api/admin/professionals")).json()).professionals as { id: string; name: string }[];
  const corte = services.find((s) => s.name === "Corte de cabelo")!;
  const joao = professionals.find((p) => p.name === "João Barbeiro")!;
  const monday = weekdayInWeeks(1, 2 + Math.floor(Math.random() * 4));
  const url = `/api/availability?businessId=${corte.businessId}&serviceId=${corte.id}&professionalId=${joao.id}&date=${monday}&ocupados=1`;

  const before = (await (await request.get(url)).json()) as { slots: { startAt: string }[]; occupied: string[] };
  expect(Array.isArray(before.occupied)).toBe(true);
  const slot = before.slots[Math.floor(Math.random() * before.slots.length)];
  expect(before.occupied).not.toContain(slot.startAt);

  const created = await request.post("/api/public/appointments", {
    data: {
      businessId: corte.businessId,
      professionalId: joao.id,
      serviceId: corte.id,
      startAt: slot.startAt,
      client: { name: "Ocupado E2E", phone: `119${Date.now().toString().slice(-8)}` },
    },
  });
  expect(created.status()).toBe(201);
  const { manageToken } = (await created.json()).appointment as { manageToken: string };

  try {
    const after = (await (await request.get(url)).json()) as { slots: { startAt: string }[]; occupied: string[] };
    expect(after.occupied).toContain(slot.startAt);
    expect(after.slots.map((s) => s.startAt)).not.toContain(slot.startAt);

    // Ocupado continua não reservável (a grade é só exibição).
    const again = await request.post("/api/public/appointments", {
      data: {
        businessId: corte.businessId,
        professionalId: joao.id,
        serviceId: corte.id,
        startAt: slot.startAt,
        client: { name: "Ocupado E2E 2", phone: `118${Date.now().toString().slice(-8)}` },
      },
    });
    expect(again.status()).toBe(400);
  } finally {
    await request.post(`/api/public/appointments/manage/${manageToken}/cancel`);
  }

  const cancelled = (await (await request.get(url)).json()) as { slots: { startAt: string }[]; occupied: string[] };
  expect(cancelled.occupied).not.toContain(slot.startAt);
  expect(cancelled.slots.map((s) => s.startAt)).toContain(slot.startAt);
});

test("grade pública mostra ocupados desabilitados e o selo Mais próximo", async ({ page }) => {
  await page.goto("/navalha-de-ouro");
  await page.getByText("Corte de cabelo", { exact: true }).click();
  await page.getByText("João Barbeiro", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "Escolha data e horário" })).toBeVisible();

  const free = page.locator('[data-testid="time-slot"]:not([data-unavailable])');
  const dateChips = page.getByTestId("date-strip-day");
  // Espera cada dia carregar (grade ou estado vazio) antes de passar ao próximo.
  const dayLoaded = free.first().or(page.getByText(/Nenhum horário disponível|Todos os horários deste dia|Fechado neste dia/));
  for (let dayIndex = 0; dayIndex < 21; dayIndex++) {
    await dayLoaded.first().waitFor();
    if (await free.first().isVisible().catch(() => false)) break;
    await dateChips.nth(dayIndex + 1).click();
  }
  await expect(free.first()).toHaveAccessibleName(/mais próximo/);
  // Ocupado (se houver no dia): visível, desabilitado e anunciado como ocupado.
  const occupied = page.locator('[data-testid="time-slot"][data-unavailable="true"]');
  if (await occupied.count()) {
    await expect(occupied.first()).toBeDisabled();
    await expect(occupied.first()).toHaveAccessibleName(/ocupado/);
  }
});
