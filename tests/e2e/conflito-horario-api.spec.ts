import { expect, test } from "@playwright/test";

import { findFreeSlot, loginAsOwner } from "./helpers";

/**
 * Invariante central: duas reservas simultâneas no mesmo horário com o mesmo
 * profissional — só uma entra. A checagem da aplicação é otimista; quem garante
 * é a exclusion constraint do Postgres, reconhecida por isOverlapConstraintViolation.
 */
test("duas reservas simultâneas no mesmo horário: só uma é aceita", async ({ page, request }) => {
  await loginAsOwner(page);
  const api = page.request;
  const services = (await (await api.get("/api/admin/services")).json()).services as { id: string; name: string; businessId: string }[];
  const professionals = (await (await api.get("/api/admin/professionals")).json()).professionals as { id: string; name: string }[];
  const corte = services.find((s) => s.name === "Corte de cabelo")!;
  const joao = professionals.find((p) => p.name === "João Barbeiro")!;

  const { startAt } = await findFreeSlot(request, { businessId: corte.businessId, serviceId: corte.id, professionalId: joao.id, weekday: 2 });
  const book = (suffix: string) =>
    request.post("/api/public/appointments", {
      data: {
        businessId: corte.businessId,
        professionalId: joao.id,
        serviceId: corte.id,
        startAt,
        client: { name: `Conflito E2E ${suffix}`, phone: `119${Date.now().toString().slice(-7)}${suffix}` },
      },
    });

  const responses = await Promise.all([book("1"), book("2"), book("3")]);
  const statuses = responses.map((response) => response.status());
  const accepted = responses.filter((response) => response.status() === 201);

  expect(accepted, `status: ${statuses.join(", ")}`).toHaveLength(1);
  expect(statuses.filter((status) => status === 400), `status: ${statuses.join(", ")}`).toHaveLength(2);

  // Limpa: cancela pelo link do cliente (o horário volta a ficar livre).
  const { manageToken } = (await accepted[0].json()).appointment as { manageToken: string };
  expect((await request.post(`/api/public/appointments/manage/${manageToken}/cancel`)).status()).toBe(200);
});
