import { expect, test } from "@playwright/test";

import { loginAsOwner } from "./helpers";

/**
 * Bloco 4A (API): sinal, "concluir e receber", valor ajustado, comissão
 * congelada, remoção de recebimento e números do Financeiro.
 */
test("recebimentos: sinal, concluir e receber, comissão congelada e financeiro", async ({ page }) => {
  await loginAsOwner(page);
  const api = page.request;

  const professionals = (await (await api.get("/api/admin/professionals")).json()).professionals as {
    id: string;
    name: string;
    bio: string | null;
    specialty: string | null;
    color: string | null;
    active: boolean;
    photoUrl: string | null;
    commissionPercent: number | null;
    photos: { url: string }[];
    professionalServices: { serviceId: string }[];
    workingHours: {
      weekday: string;
      startMinute: number;
      endMinute: number;
      breakStartMinute: number | null;
      breakEndMinute: number | null;
    }[];
  }[];
  const joao = professionals.find((p) => p.name === "João Barbeiro")!;
  const services = (await (await api.get("/api/admin/services")).json()).services as { id: string; name: string }[];
  const corte = services.find((s) => s.name === "Corte de cabelo")!;

  // Comissão do João em 40% durante o teste (restaurada no fim).
  const saveJoao = (commissionPercent: number | null) =>
    api.patch(`/api/admin/professionals/${joao.id}`, {
      data: {
        name: joao.name,
        bio: joao.bio,
        specialty: joao.specialty,
        color: joao.color,
        active: joao.active,
        photoUrl: joao.photoUrl,
        photoUrls: joao.photos.map((p) => p.url),
        serviceIds: joao.professionalServices.map((ps) => ps.serviceId),
        workingHours: joao.workingHours.map(({ weekday, startMinute, endMinute, breakStartMinute, breakEndMinute }) => ({
          weekday,
          startMinute,
          endMinute,
          breakStartMinute,
          breakEndMinute,
        })),
        commissionPercent,
      },
    });
  expect((await saveJoao(40)).status()).toBe(200);

  try {
    // Segunda-feira distante, horário aleatório entre 09:00 e 11:15.
    const monday = new Date();
    monday.setUTCDate(monday.getUTCDate() + 7 * (10 + Math.floor(Math.random() * 30)));
    monday.setUTCDate(monday.getUTCDate() + ((8 - monday.getUTCDay()) % 7));
    const minute = 9 * 60 + 15 * Math.floor(Math.random() * 10);
    const hhmm = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
    const created = await api.post("/api/admin/appointments", {
      data: {
        professionalId: joao.id,
        serviceId: corte.id,
        startAt: `${monday.toISOString().slice(0, 10)}T${hhmm}:00-03:00`,
        client: { name: `Financeiro E2E ${Date.now()}`, phone: `119${Date.now().toString().slice(-8)}` },
      },
    });
    expect(created.status()).toBe(201);
    const appointmentId = (await created.json()).appointment.id as string;
    const payments = () => api.get(`/api/admin/appointments/${appointmentId}/payments`).then((r) => r.json());

    // Nasce pendente com o preço do serviço (R$ 50,00).
    expect((await payments()).summary).toMatchObject({ priceCents: 5000, balanceCents: 5000, status: "PENDING" });

    // Data de recebimento no futuro: recusado.
    const future = await api.post(`/api/admin/appointments/${appointmentId}/payments`, {
      data: { amountCents: 1000, method: "PIX", receivedAt: new Date(Date.now() + 3 * 86_400_000).toISOString() },
    });
    expect(future.status()).toBe(400);

    // Sinal de R$ 20 no PIX → parcial; % do João congelada no pagamento.
    const sinal = await api.post(`/api/admin/appointments/${appointmentId}/payments`, {
      data: { amountCents: 2000, method: "PIX", receivedAt: new Date().toISOString(), note: "Sinal" },
    });
    expect(sinal.status()).toBe(201);
    expect((await sinal.json()).payment.commissionPercent).toBe(40);
    expect((await payments()).summary).toMatchObject({ paidCents: 2000, balanceCents: 3000, status: "PARTIAL" });

    // Mudar a % depois não mexe no pagamento já registrado.
    expect((await saveJoao(10)).status()).toBe(200);
    expect((await payments()).payments[0].commissionPercent).toBe(40);

    // Concluir e receber: valor ajustado para R$ 60 e saldo de R$ 40 em dinheiro → pago.
    const complete = await api.post(`/api/admin/appointments/${appointmentId}/complete`, {
      data: { payment: { amountCents: 4000, method: "CASH", receivedAt: new Date().toISOString(), priceCents: 6000 } },
    });
    expect(complete.status()).toBe(200);
    const done = await payments();
    expect(done.summary).toMatchObject({ priceCents: 6000, paidCents: 6000, balanceCents: 0, status: "PAID" });
    expect(done.payments[1].commissionPercent).toBe(10);

    // Concluir de novo: transição inválida.
    expect((await api.post(`/api/admin/appointments/${appointmentId}/complete`, { data: {} })).status()).toBe(400);

    // Financeiro de hoje inclui os recebimentos; comissão = 40% de 20 + 10% de 40.
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
    const list = (await (await api.get(`/api/admin/finance/payments?startDate=${today}&endDate=${today}`)).json())
      .payments as { appointmentId: string; amountCents: number; method: string }[];
    expect(list.filter((p) => p.appointmentId === appointmentId).map((p) => p.amountCents).sort()).toEqual([2000, 4000]);
    const summary = (await (await api.get(`/api/admin/finance/summary?startDate=${today}&endDate=${today}`)).json())
      .summary;
    expect(summary.receivedCents).toBeGreaterThanOrEqual(6000);
    const commissions = (
      await (await api.get(`/api/admin/finance/commissions?startDate=${today}&endDate=${today}`)).json()
    ).commissions as { professional: { id: string }; commissionCents: number }[];
    expect(commissions.find((c) => c.professional.id === joao.id)!.commissionCents).toBeGreaterThanOrEqual(800 + 400);

    // Remover o recebimento em dinheiro: volta a ter saldo e entra em "A receber".
    const cashId = done.payments[1].id as string;
    expect((await api.delete(`/api/admin/payments/${cashId}`)).status()).toBe(200);
    expect((await payments()).summary).toMatchObject({ balanceCents: 4000, status: "PARTIAL" });
    const receivables = (await (await api.get("/api/admin/finance/receivables")).json()).receivables as {
      appointmentId: string;
    }[];
    expect(receivables.some((r) => r.appointmentId === appointmentId)).toBe(true);

    // Período inválido.
    expect((await api.get("/api/admin/finance/summary?startDate=2026-10-10&endDate=2026-10-01")).status()).toBe(400);

    // Quita de novo para não deixar pendência no banco local.
    await api.post(`/api/admin/appointments/${appointmentId}/payments`, {
      data: { amountCents: 4000, method: "CASH", receivedAt: new Date().toISOString() },
    });
  } finally {
    expect((await saveJoao(joao.commissionPercent ?? null)).status()).toBe(200);
  }
});
