import { expect, test } from "@playwright/test";

import { loginAsOwner } from "./helpers";

/**
 * Bloco 6A: políticas de reserva (antecedência mínima, janela máxima e prazo
 * para cancelar) valem para a disponibilidade pública e o link do cliente.
 * O teste altera as políticas do seed e restaura no fim.
 */

const TIMEZONE = "America/Sao_Paulo";
const localDate = (offsetDays: number) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000));

test("antecedência, janela e prazo para cancelar valem na reserva pública", async ({ page, request }) => {
  await loginAsOwner(page);
  const api = page.request;
  const original = (await (await api.get("/api/admin/business")).json()).business;
  const services = (await (await api.get("/api/admin/services")).json()).services as { id: string; name: string; businessId: string }[];
  const professionals = (await (await api.get("/api/admin/professionals")).json()).professionals as { id: string; name: string }[];
  const corte = services.find((s) => s.name === "Corte de cabelo")!;
  const joao = professionals.find((p) => p.name === "João Barbeiro")!;
  const slotsOn = async (date: string) =>
    (
      (await (
        await request.get(`/api/availability?businessId=${corte.businessId}&serviceId=${corte.id}&professionalId=${joao.id}&date=${date}`)
      ).json()) as { slots: { startAt: string }[] }
    ).slots;

  const setPolicies = (policies: { minBookingNoticeMinutes: number; maxBookingWindowDays: number; cancellationDeadlineHours: number }) =>
    api.patch("/api/admin/business", { data: { secao: "reservas", policyText: original.policyText, ...policies } });

  let manageToken: string | null = null;
  try {
    // Antecedência de 2 dias, janela de 14 dias, cancelamento até 7 dias antes.
    expect((await setPolicies({ minBookingNoticeMinutes: 2 * 24 * 60, maxBookingWindowDays: 14, cancellationDeadlineHours: 7 * 24 })).status()).toBe(200);

    // Antes da antecedência: nenhum horário. Depois da janela: nenhum horário.
    expect(await slotsOn(localDate(1))).toEqual([]);
    expect(await slotsOn(localDate(20))).toEqual([]);

    // Entre 3 e 6 dias (quatro dias seguidos: sempre há dia útil, mesmo com feriado):
    // há horário, e nenhum antes de agora + 2 dias. Tudo a menos de 7 dias (prazo de cancelamento).
    let date = "";
    let slots: { startAt: string }[] = [];
    for (const offset of [3, 4, 5, 6]) {
      slots = await slotsOn(localDate(offset));
      if (slots.length > 0) {
        date = localDate(offset);
        break;
      }
    }
    expect(slots.length, "dia útil entre 3 e 6 dias à frente").toBeGreaterThan(0);
    const earliest = Date.now() + 2 * 24 * 60 * 60 * 1000;
    expect(slots.every((slot) => Date.parse(slot.startAt) >= earliest - 60_000)).toBe(true);

    // Reserva além da janela é recusada, mesmo num horário de expediente.
    const beyond = await request.post("/api/public/appointments", {
      data: {
        businessId: corte.businessId,
        professionalId: joao.id,
        serviceId: corte.id,
        startAt: `${localDate(21)}T10:00:00-03:00`,
        client: { name: "Política E2E", phone: `119${Date.now().toString().slice(-8)}` },
      },
    });
    expect(beyond.status()).toBe(400);

    // Reserva dentro da janela é aceita…
    const created = await request.post("/api/public/appointments", {
      data: {
        businessId: corte.businessId,
        professionalId: joao.id,
        serviceId: corte.id,
        startAt: slots[slots.length - 1].startAt,
        client: { name: "Política E2E", phone: `119${Date.now().toString().slice(-8)}` },
      },
    });
    expect(created.status(), date).toBe(201);
    manageToken = (await created.json()).appointment.manageToken as string;

    // …mas faltam menos de 7 dias: o link não cancela nem remarca.
    const manage = await (await request.get(`/api/public/appointments/manage/${manageToken}`)).json();
    expect(manage.canChange).toBe(false);
    const cancel = await request.post(`/api/public/appointments/manage/${manageToken}/cancel`);
    expect(cancel.status()).toBe(400);
    expect((await cancel.json()).error).toContain("Fale com o estabelecimento");
  } finally {
    await setPolicies({
      minBookingNoticeMinutes: original.minBookingNoticeMinutes,
      maxBookingWindowDays: original.maxBookingWindowDays,
      cancellationDeadlineHours: original.cancellationDeadlineHours,
    });
    if (manageToken) {
      // Sem prazo de novo: o próprio link cancela, e o horário volta a ficar livre.
      expect((await request.post(`/api/public/appointments/manage/${manageToken}/cancel`)).status()).toBe(200);
    }
  }
});
