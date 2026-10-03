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

test("D3: painel instalável — manifesto só no painel, ícones e guia de instalação", async ({ page, request }) => {
  const manifest = await request.get("/admin.webmanifest");
  expect(manifest.status()).toBe(200);
  expect(await manifest.json()).toMatchObject({ name: "Aprazzo", start_url: "/admin", scope: "/admin", display: "standalone" });
  for (const icon of ["/brand/app-icon-192.png", "/brand/app-icon-512.png", "/brand/app-icon-maskable-512.png"]) {
    expect((await request.get(icon)).headers()["content-type"]).toContain("image/png");
  }

  // Só o painel aponta para o manifesto; a página de reservas do cliente, não.
  await page.goto("/admin/login");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/admin.webmanifest");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  await page.goto("/navalha-de-ouro");
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);

  await loginAsOwner(page);
  await page.goto("/admin/instalar");
  await expect(page.getByRole("heading", { name: "Instalar no celular" })).toBeVisible();
  await expect(page.getByText("Adicionar à Tela de Início")).toBeVisible();
  await expect(page.getByText("Instalar app")).toBeVisible();
});

test("D4: importar clientes — prévia, importar, repetido pula ou atualiza, e a tela com upload", async ({ page, browser }) => {
  await loginAsOwner(page);
  const api = page.request;
  const tag = Date.now().toString().slice(-6);
  const phone = (n: number) => `(11) 9${tag.slice(0, 4)}-${tag.slice(4)}${n}${n}`;
  const csv = ["nome;telefone;email;observacoes;tags", `Import A ${tag};${phone(1)};a${tag}@ex.com;Primeira visita;Fiel`, `Import B ${tag};${phone(2)};;;`, "Sem DDD;99999-0000;;;"].join("\n");

  // Prévia: nada gravado, erro apontando a linha.
  const preview = await (await api.post("/api/admin/clients/import", { data: { csv } })).json();
  expect(preview).toMatchObject({ validCount: 2, newCount: 2, existingCount: 0, created: 0 });
  expect(preview.errors).toEqual([{ line: 4, message: expect.stringContaining("sem DDD") }]);

  // Importar.
  const applied = await (await api.post("/api/admin/clients/import", { data: { csv, apply: true } })).json();
  expect(applied).toMatchObject({ created: 2, updated: 0 });

  // De novo: os dois já existem. Pular não muda; atualizar troca o nome e soma tags.
  const again = `nome;telefone;tags\nNovo Nome ${tag};${phone(1)};VIP`;
  expect(await (await api.post("/api/admin/clients/import", { data: { csv: again, apply: true } })).json()).toMatchObject({ existingCount: 1, created: 0, updated: 0 });
  expect(await (await api.post("/api/admin/clients/import", { data: { csv: again, apply: true, mode: "update" } })).json()).toMatchObject({ updated: 1 });
  // A busca também casa os dígitos com telefones: filtra pelo nome exato.
  const found = ((await (await api.get(`/api/admin/clients?q=${encodeURIComponent(`Novo Nome ${tag}`)}`)).json()).clients as { name: string; tags: string[] }[]).filter(
    (client) => client.name === `Novo Nome ${tag}`,
  );
  expect(found).toHaveLength(1);
  expect(found[0].tags.sort()).toEqual(["Fiel", "VIP"]);

  // Tela: modelo para baixar e upload do arquivo com prévia.
  await page.goto("/admin/clientes");
  await page.getByRole("link", { name: "Importar planilha" }).click();
  await expect(page.getByRole("heading", { name: "Importar planilha" })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar modelo" }).click();
  expect((await download).suggestedFilename()).toBe("modelo-clientes.csv");
  await page.getByLabel(/escolher a planilha/).setInputFiles({
    name: "clientes.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(`nome;telefone\nTela ${tag};${phone(3)}\n`),
  });
  await expect(page.getByText(/1 linha pronta: 1 novo/)).toBeVisible();
  await page.getByRole("button", { name: "Importar 1 linha" }).click();
  await expect(page.getByText(/Importação concluída: 1 novo/)).toBeVisible();

  // Profissional não importa.
  const professionals = (await (await api.get("/api/admin/professionals")).json()).professionals as { id: string; name: string }[];
  const joao = professionals.find((p) => p.name === "João Barbeiro")!;
  const context = await loginAsProfessional(browser, api, joao.id, { name: "João Barbeiro", email: "joao@navalhadeouro.com", password: "senha123" });
  try {
    expect((await context.request.post("/api/admin/clients/import", { data: { csv } })).status()).toBe(403);
  } finally {
    await context.close();
  }
});
