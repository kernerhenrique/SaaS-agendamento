import { expect, test } from "@playwright/test";

/**
 * Agenda do painel: drawer de detalhes, mudança de status e remarcação.
 * Usa o dono do seed (prisma/seed.ts) e cria o próprio agendamento numa data
 * futura; no fim cancela, liberando o horário para a próxima execução.
 */
test("dono abre o agendamento no drawer, remarca e cancela", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill("dono@navalhadeouro.com");
  await page.getByLabel("Senha").fill("senha123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);

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

  const drawer = page.getByRole("dialog");
  await expect(drawer.getByText(clientName)).toBeVisible();
  // Encaixe feito pelo painel já nasce confirmado.
  await expect(drawer.getByText("Confirmado")).toBeVisible();

  await drawer.getByRole("button", { name: "Remarcar" }).click();
  await drawer.getByLabel("Horário").fill("15:00");
  await drawer.getByRole("button", { name: "Confirmar novo horário" }).click();
  await expect(page.getByText("Agendamento remarcado.")).toBeVisible();
  await expect(drawer.getByText(/15:00/)).toBeVisible();

  await drawer.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByText("Status: Cancelado")).toBeVisible();
});
