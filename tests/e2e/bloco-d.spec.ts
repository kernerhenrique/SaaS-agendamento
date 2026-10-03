import { expect, test } from "@playwright/test";

import { findFreeSlot, loginAsOwner, loginAsProfessional } from "./helpers";

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

test("D2: dia fechado some da página, encaixe pede confirmação e reabrir devolve os horários", async ({ page, request }) => {
  await loginAsOwner(page);
  const api = page.request;
  const services = (await (await api.get("/api/admin/services")).json()).services as { id: string; name: string; businessId: string }[];
  const professionals = (await (await api.get("/api/admin/professionals")).json()).professionals as { id: string; name: string }[];
  const corte = services.find((s) => s.name === "Corte de cabelo")!;
  const joao = professionals.find((p) => p.name === "João Barbeiro")!;
  const { date, startAt } = await findFreeSlot(request, { businessId: corte.businessId, serviceId: corte.id, professionalId: joao.id, weekday: 3 });
  const availability = () =>
    request.get(`/api/availability?businessId=${corte.businessId}&serviceId=${corte.id}&professionalId=${joao.id}&date=${date}&ocupados=1`).then((r) => r.json());

  // Fechar o dia.
  const closed = await api.post("/api/admin/business/closures", { data: { closures: [{ startDate: date, reason: "Feriado E2E" }] } });
  expect(closed.status()).toBe(201);
  const closureId = ((await closed.json()).created as { id: string }[])[0].id;
  try {
    // Página: nenhum horário (nem ocupado riscado) e o motivo.
    const data = await availability();
    expect(data).toMatchObject({ slots: [], occupied: [], closedReason: "Feriado E2E" });

    // Reserva pública no dia fechado é recusada pelo servidor.
    const publicBooking = await request.post("/api/public/appointments", {
      data: { businessId: corte.businessId, professionalId: joao.id, serviceId: corte.id, startAt, client: { name: "Fechado E2E", phone: `119${Date.now().toString().slice(-8)}` } },
    });
    expect(publicBooking.status()).toBe(400);

    // Encaixe pelo painel: sem confirmação, recusado com o motivo; com "mesmo assim", entra.
    const encaixe = (extra: Record<string, unknown> = {}) =>
      api.post("/api/admin/appointments", {
        data: { professionalId: joao.id, serviceId: corte.id, startAt, client: { name: `Encaixe fechado ${Date.now()}`, phone: `119${Date.now().toString().slice(-8)}` }, ...extra },
      });
    const refused = await encaixe();
    expect(refused.status()).toBe(400);
    expect(await refused.json()).toMatchObject({ code: "OUTSIDE_WORKING_HOURS", error: expect.stringContaining("Feriado E2E") });
    const forced = await encaixe({ allowOutsideHours: true });
    expect(forced.status()).toBe(201);
    const forcedId = ((await forced.json()).appointment as { id: string }).id;
    await api.patch(`/api/admin/appointments/${forcedId}/status`, { data: { status: "CANCELLED" } });

    // Configurações: o dia aparece na lista e os feriados nacionais estão no botão.
    await page.goto("/admin/configuracoes#fechados");
    await expect(page.getByText("Feriado E2E")).toBeVisible();
    await page.getByRole("button", { name: "Adicionar feriados nacionais" }).click();
    await expect(page.getByRole("dialog").getByText("Natal")).toBeVisible();
    await page.getByRole("button", { name: "Cancelar" }).click();
  } finally {
    // Reabrir: os horários voltam.
    expect((await api.delete(`/api/admin/business/closures/${closureId}`)).status()).toBe(200);
  }
  expect((await availability()).slots.length).toBeGreaterThan(0);
});

test("D2: profissional vê os dias fechados, mas só o dono fecha e reabre", async ({ page, browser }) => {
  await loginAsOwner(page);
  const professionals = (await (await page.request.get("/api/admin/professionals")).json()).professionals as { id: string; name: string }[];
  const joao = professionals.find((p) => p.name === "João Barbeiro")!;
  const context = await loginAsProfessional(browser, page.request, joao.id, { name: "João Barbeiro", email: "joao@navalhadeouro.com", password: "senha123" });
  try {
    expect((await context.request.get("/api/admin/business/closures")).status()).toBe(200);
    const attempt = await context.request.post("/api/admin/business/closures", { data: { closures: [{ startDate: "2030-01-02", reason: "x" }] } });
    expect(attempt.status()).toBe(403);
  } finally {
    await context.close();
  }
});
