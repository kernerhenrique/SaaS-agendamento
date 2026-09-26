import { expect, test } from "@playwright/test";

import { loginAsOwner } from "./helpers";

/**
 * Agenda do painel: drawer de detalhes, mudança de status e remarcação.
 * Usa o dono do seed (prisma/seed.ts) e cria o próprio agendamento numa data
 * futura; no fim cancela, liberando o horário para a próxima execução.
 */
test("dono abre o agendamento no drawer, remarca e cancela", async ({ page }) => {
  await loginAsOwner(page);

  const professionals = (await (await page.request.get("/api/admin/professionals")).json()).professionals as {
    id: string;
    name: string;
  }[];
  const joao = professionals.find((p) => p.name === "João Barbeiro")!;
  const services = (await (await page.request.get("/api/admin/services")).json()).services as {
    id: string;
    name: string;
  }[];
  const corte = services.find((s) => s.name === "Corte de cabelo")!;

  // Uma segunda-feira entre 5 e 40 semanas à frente, num horário aleatório de
  // 09:00 a 10:45 — evita colidir com execuções anteriores e com o seed.
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 7 * (5 + Math.floor(Math.random() * 35)));
  date.setUTCDate(date.getUTCDate() + ((8 - date.getUTCDay()) % 7));
  const isoDate = date.toISOString().slice(0, 10);
  const minute = 9 * 60 + 15 * Math.floor(Math.random() * 8);
  const hhmm = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;

  const clientName = `Agenda E2E ${Date.now()}`;
  const created = await page.request.post("/api/admin/appointments", {
    data: {
      professionalId: joao.id,
      serviceId: corte.id,
      startAt: `${isoDate}T${hhmm}:00-03:00`,
      client: { name: clientName, phone: `119${Date.now().toString().slice(-8)}` },
    },
  });
  expect(created.status()).toBe(201);

  await page.goto(`/admin/agenda?date=${isoDate}`);
  await page.getByRole("button", { name: new RegExp(clientName) }).click();

  const drawer = page.getByRole("dialog", { name: corte.name });
  await expect(drawer.getByText(clientName)).toBeVisible();
  // Encaixe feito pelo painel já nasce confirmado.
  await expect(drawer.getByText("Confirmado")).toBeVisible();

  await drawer.getByRole("button", { name: "Remarcar" }).click();
  await drawer.getByLabel("Horário").fill("15:00");
  await drawer.getByRole("button", { name: "Confirmar novo horário" }).click();
  await expect(page.getByText("Agendamento remarcado.")).toBeVisible();
  await expect(drawer.getByText(/15:00/)).toBeVisible();

  // Cancelar pede confirmação; "Voltar" não muda nada.
  const confirmCancel = page.getByRole("dialog", { name: "Cancelar agendamento?" });
  await drawer.getByRole("button", { name: "Cancelar", exact: true }).click();
  await confirmCancel.getByRole("button", { name: "Voltar" }).click();
  await expect(confirmCancel).toBeHidden();
  await expect(drawer.getByText("Confirmado")).toBeVisible();

  await drawer.getByRole("button", { name: "Cancelar", exact: true }).click();
  await confirmCancel.getByRole("button", { name: "Cancelar agendamento" }).click();
  await expect(page.getByText("Status: Cancelado")).toBeVisible();
});

test("encaixe pelo painel recusa passado e só aceita fora do expediente com confirmação", async ({ page }) => {
  await loginAsOwner(page);

  const professionals = (await (await page.request.get("/api/admin/professionals")).json()).professionals as {
    id: string;
    name: string;
  }[];
  const joao = professionals.find((p) => p.name === "João Barbeiro")!;
  const services = (await (await page.request.get("/api/admin/services")).json()).services as {
    id: string;
    name: string;
  }[];
  const corte = services.find((s) => s.name === "Corte de cabelo")!;
  const create = (startAt: string, extra: Record<string, unknown> = {}) =>
    page.request.post("/api/admin/appointments", {
      data: {
        professionalId: joao.id,
        serviceId: corte.id,
        startAt,
        client: { name: `Regras E2E ${Date.now()}`, phone: `119${Date.now().toString().slice(-8)}` },
        ...extra,
      },
    });

  // Passado (ontem): recusado, sem opção de "mesmo assim".
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const past = await create(yesterday, { allowOutsideHours: true });
  expect(past.status()).toBe(400);
  expect((await past.json()).code).toBeUndefined();

  // Domingo (João não tem expediente), num horário aleatório para não colidir entre execuções.
  const sunday = new Date();
  sunday.setUTCDate(sunday.getUTCDate() + 7 * (5 + Math.floor(Math.random() * 35)));
  sunday.setUTCDate(sunday.getUTCDate() + ((7 - sunday.getUTCDay()) % 7));
  const minute = 9 * 60 + 15 * Math.floor(Math.random() * 32);
  const hhmm = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
  const sundayStart = `${sunday.toISOString().slice(0, 10)}T${hhmm}:00-03:00`;

  const refused = await create(sundayStart);
  expect(refused.status()).toBe(400);
  expect((await refused.json()).code).toBe("OUTSIDE_WORKING_HOURS");

  const confirmed = await create(sundayStart, { allowOutsideHours: true });
  expect(confirmed.status()).toBe(201);

  // Libera o horário para a próxima execução.
  const { appointment } = await confirmed.json();
  const cancelled = await page.request.patch(`/api/admin/appointments/${appointment.id}/status`, {
    data: { status: "CANCELLED" },
  });
  expect(cancelled.status()).toBe(200);
});
