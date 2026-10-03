import { expect, test } from "@playwright/test";

import { findFreeSlot, loginAsOwner } from "./helpers";

/**
 * Bloco D: avaliações saem (link do cliente agradece e convida a voltar), dias
 * fechados, painel instalável, importação de clientes e agendamento recorrente.
 */

test("D1: atendimento concluído agradece e convida a reservar de novo, sem pedir avaliação", async ({ page, request }) => {
  await loginAsOwner(page);
  const api = page.request;
  const services = (await (await api.get("/api/admin/services")).json()).services as { id: string; name: string; businessId: string }[];
  const professionals = (await (await api.get("/api/admin/professionals")).json()).professionals as { id: string; name: string }[];
  const corte = services.find((s) => s.name === "Corte de cabelo")!;
  const joao = professionals.find((p) => p.name === "João Barbeiro")!;
  const { startAt } = await findFreeSlot(request, { businessId: corte.businessId, serviceId: corte.id, professionalId: joao.id, weekday: 5 });
  const booked = await request.post("/api/public/appointments", {
    data: { businessId: corte.businessId, professionalId: joao.id, serviceId: corte.id, startAt, client: { name: "Cliente D1", phone: `119${Date.now().toString().slice(-8)}` } },
  });
  expect(booked.status()).toBe(201);
  const { id, manageToken } = (await booked.json()).appointment as { id: string; manageToken: string };

  // Agendado pode ser concluído direto (o cliente veio sem confirmar presença).
  expect((await api.patch(`/api/admin/appointments/${id}/status`, { data: { status: "COMPLETED" } })).status()).toBe(200);

  await page.goto(`/agendamento/${manageToken}/gerenciar`);
  await expect(page.getByRole("heading", { name: "Obrigado pela visita!" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Reservar de novo" })).toHaveAttribute("href", "/navalha-de-ouro");
  await expect(page.getByText(/avalia/i)).toHaveCount(0);

  // A rota de avaliação não existe mais.
  expect((await request.post(`/api/public/appointments/manage/${manageToken}/review`, { data: { rating: 5 } })).status()).toBe(404);
});
