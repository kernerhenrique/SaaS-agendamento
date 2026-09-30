import { expect, test } from "@playwright/test";

import { createEveningAppointment, localDateInDays, loginAsOwner, loginAsProfessional } from "./helpers";

/**
 * Vários usuários, bloco B: o profissional (João) só enxerga e mexe na própria
 * agenda e nos próprios clientes, não entra nas áreas do dono e não dá
 * desconto. Cliente compartilhada com o Marcos: mesmo cadastro, cada um vê o
 * próprio histórico e as notas são as mesmas. O dono vê "quem fez".
 */
test("profissional: só a própria agenda e clientes, sem áreas do dono nem desconto", async ({ page, browser }) => {
  await loginAsOwner(page);
  const owner = page.request;
  const professionals = (await (await owner.get("/api/admin/professionals")).json()).professionals as { id: string; name: string }[];
  const services = (await (await owner.get("/api/admin/services")).json()).services as { id: string; name: string; priceCents: number }[];
  const joao = professionals.find((p) => p.name === "João Barbeiro")!;
  const marcos = professionals.find((p) => p.name === "Marcos Estilista")!;
  const corte = services.find((s) => s.name === "Corte de cabelo")!;
  const barba = services.find((s) => s.name === "Barba")!;

  const joaoContext = await loginAsProfessional(browser, owner, joao.id, {
    name: "João E2E",
    email: "joao.e2e@example.com",
    password: "senha-do-joao",
  });
  const asJoao = joaoContext.request;
  const date = localDateInDays(2);
  const stamp = Date.now().toString().slice(-8);
  const sharedPhone = `119${stamp}`;
  const toCancel: string[] = [];

  try {
    // Áreas do dono: sem permissão (403).
    for (const url of [
      `/api/admin/finance/summary?startDate=${date}&endDate=${date}`,
      `/api/admin/reports?secao=atendimentos&startDate=${date}&endDate=${date}`,
      "/api/admin/business",
      "/api/admin/messages/templates",
      `/api/admin/staff/${marcos.id}`,
    ]) {
      expect((await asJoao.get(url)).status(), url).toBe(403);
    }
    expect((await asJoao.post("/api/admin/services", { data: { name: "X" } })).status()).toBe(403);
    expect((await asJoao.delete("/api/admin/payments/qualquer")).status()).toBe(403);

    // Equipe: só o próprio cadastro; o do colega "não existe".
    const visible = (await (await asJoao.get("/api/admin/professionals")).json()).professionals as { id: string }[];
    expect(visible.map((p) => p.id)).toEqual([joao.id]);
    expect((await asJoao.get(`/api/admin/professionals/${marcos.id}`)).status()).toBe(404);

    // O dono marca a Maria com o Marcos.
    const sharedName = `Compartilhada E2E ${stamp}`;
    const withMarcos = await createEveningAppointment(owner, {
      professionalId: marcos.id,
      serviceId: barba.id,
      date,
      client: { name: sharedName, phone: sharedPhone },
    });
    toCancel.push(withMarcos.id);

    // João não vê o agendamento nem a cliente do colega; a busca por telefone não revela o nome.
    expect((await asJoao.get(`/api/admin/appointments/${withMarcos.id}`)).status()).toBe(404);
    expect((await asJoao.patch(`/api/admin/appointments/${withMarcos.id}/status`, { data: { status: "CANCELLED" } })).status()).toBe(404);
    expect((await (await asJoao.get(`/api/admin/clients/lookup?phone=${sharedPhone}`)).json()).client).toBeNull();
    const joaoClients = (await (await asJoao.get(`/api/admin/clients?q=${stamp}`)).json()).clients as unknown[];
    expect(joaoClients).toEqual([]);

    // A agenda do João só traz os dele, mesmo pedindo a do Marcos.
    const agenda = (await (await asJoao.get(`/api/admin/appointments?startDate=${date}&professionalId=${marcos.id}`)).json())
      .appointments as { professional: { id: string } }[];
    expect(agenda.every((a) => a.professional.id === joao.id)).toBe(true);

    // Marcar na agenda do colega: proibido.
    const onMarcos = await asJoao.post("/api/admin/appointments", {
      data: { professionalId: marcos.id, serviceId: corte.id, startAt: `${date}T21:00:00-03:00`, allowOutsideHours: true, client: { name: "X", phone: `118${stamp}` } },
    });
    expect(onMarcos.status()).toBe(403);

    // João marca a mesma cliente (pelo telefone) com outro nome: mesmo cadastro, nome não muda.
    const withJoao = await createEveningAppointment(asJoao, {
      professionalId: joao.id,
      serviceId: barba.id,
      date,
      client: { name: "Nome Digitado Errado", phone: sharedPhone },
    });
    const ownerSearch = (await (await owner.get(`/api/admin/clients?q=${stamp}`)).json()).clients as { id: string; name: string }[];
    expect(ownerSearch).toHaveLength(1);
    expect(ownerSearch[0].name).toBe(sharedName);
    const clientId = ownerSearch[0].id;

    // Agora ela é cliente do João: vê só o histórico com ele e sem o total gasto.
    const joaoDetail = await (await asJoao.get(`/api/admin/clients/${clientId}`)).json();
    expect(joaoDetail.history).toHaveLength(1);
    expect(joaoDetail.totalSpentCents).toBeNull();
    expect((await (await owner.get(`/api/admin/clients/${clientId}`)).json()).history).toHaveLength(2);

    // Notas compartilhadas, com "editado por".
    expect((await asJoao.patch(`/api/admin/clients/${clientId}`, { data: { internalNotes: "Prefere máquina 2", tags: ["vip"] } })).status()).toBe(200);
    const ownerDetail = (await (await owner.get(`/api/admin/clients/${clientId}`)).json()).client;
    expect(ownerDetail).toMatchObject({ internalNotes: "Prefere máquina 2", notesUpdatedBy: "João E2E" });

    // Pagamento: sem desconto e sem mudar o valor; o normal passa.
    const payment = (extra: Record<string, unknown>) => ({
      amountCents: barba.priceCents,
      method: "PIX",
      receivedAt: new Date().toISOString(),
      ...extra,
    });
    expect((await asJoao.post(`/api/admin/appointments/${withJoao.id}/payments`, { data: payment({ discountCents: 500 }) })).status()).toBe(403);
    expect((await asJoao.post(`/api/admin/appointments/${withJoao.id}/payments`, { data: payment({ priceCents: 1 }) })).status()).toBe(403);
    const completed = await asJoao.post(`/api/admin/appointments/${withJoao.id}/complete`, {
      data: { payment: payment({ priceCents: barba.priceCents }) },
    });
    expect(completed.status()).toBe(200);

    // O dono vê quem marcou; e quem cancelou quando o João cancela o próprio.
    const detail = await (await owner.get(`/api/admin/appointments/${withJoao.id}`)).json();
    expect(detail.audit.createdBy).toEqual({ name: "João E2E", role: "PROFESSIONAL" });
    const another = await createEveningAppointment(asJoao, {
      professionalId: joao.id,
      serviceId: corte.id,
      date: localDateInDays(3),
      client: { name: "Outro E2E", phone: `117${stamp}` },
    });
    expect((await asJoao.patch(`/api/admin/appointments/${another.id}/status`, { data: { status: "CANCELLED" } })).status()).toBe(200);
    expect((await (await owner.get(`/api/admin/appointments/${another.id}`)).json()).audit.cancelledBy).toEqual({
      name: "João E2E",
      role: "PROFESSIONAL",
    });
  } finally {
    for (const id of toCancel) await owner.patch(`/api/admin/appointments/${id}/status`, { data: { status: "CANCELLED" } });
    await owner.delete(`/api/admin/staff/${joao.id}`);
    await joaoContext.close();
  }
});
