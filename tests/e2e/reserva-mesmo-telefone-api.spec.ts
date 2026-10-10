import { expect, test } from "@playwright/test";

import { findFreeSlot, loginAsOwner } from "./helpers";

/**
 * Reserva pela página com um telefone já cadastrado (ex.: a mãe reserva para o
 * filho com o próprio celular): o cadastro mantém o nome e o agendamento leva a
 * observação "Reservado como: …". No painel, o dono continua podendo corrigir.
 */
test("reserva pública com telefone já cadastrado não renomeia o cliente e anota o nome digitado", async ({ page }) => {
  await loginAsOwner(page);
  const api = page.request;
  const phone = `119${Date.now().toString().slice(-8)}`;
  const services = (await (await api.get("/api/admin/services")).json()).services as {
    id: string;
    businessId: string;
    visibleOnline: boolean;
    professionalServices: { professional: { id: string; active: boolean } }[];
  }[];
  const service = services.find((s) => s.visibleOnline && s.professionalServices.some((ps) => ps.professional.active))!;
  const professionalId = service.professionalServices.find((ps) => ps.professional.active)!.professional.id;
  const book = async (name: string, weekday: number) => {
    const slot = await findFreeSlot(api, { businessId: service.businessId, serviceId: service.id, professionalId, weekday });
    const response = await page.request.post("/api/public/appointments", {
      data: { businessId: service.businessId, professionalId, serviceId: service.id, startAt: slot.startAt, client: { name, phone } },
    });
    expect(response.status(), await response.text()).toBe(201);
    return (await response.json()).appointment.id as string;
  };

  // Primeira reserva cria o cadastro com o nome da mãe.
  const first = await book("Maria Mãe E2E", 2);
  // Segunda, mesmo celular, outro nome: o cadastro continua "Maria Mãe E2E".
  const second = await book("Pedrinho E2E", 4);
  const { client } = await (await api.get(`/api/admin/clients/lookup?phone=${phone}`)).json();
  expect(client.name).toBe("Maria Mãe E2E");

  // O dono vê no detalhe para quem foi a reserva.
  const detail = await (await api.get(`/api/admin/appointments/${second}`)).json();
  expect(detail.appointment.notes).toBe("Reservado como: Pedrinho E2E");
  // Mesmo nome de novo (com outra grafia): sem observação.
  const third = await book("maria mae e2e", 5);
  expect((await (await api.get(`/api/admin/appointments/${third}`)).json()).appointment.notes).toBeNull();

  for (const id of [first, second, third]) {
    await api.patch(`/api/admin/appointments/${id}/status`, { data: { status: "CANCELLED" } });
  }
});
