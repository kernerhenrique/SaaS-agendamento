import { expect, test } from "@playwright/test";

import { loginAsOwner } from "./helpers";

/** Bloco 4B: recebimento no drawer do agendamento (concluir e receber, saldo, remover). */
test("dono conclui e recebe no drawer, completa o saldo e remove um recebimento", async ({ page }) => {
  await loginAsOwner(page);
  const professionals = (await (await page.request.get("/api/admin/professionals")).json()).professionals as {
    id: string;
    name: string;
  }[];
  const services = (await (await page.request.get("/api/admin/services")).json()).services as {
    id: string;
    name: string;
  }[];
  const joao = professionals.find((p) => p.name === "João Barbeiro")!;
  const corte = services.find((s) => s.name === "Corte de cabelo")!;

  // Segunda-feira distante, horário aleatório de 14:00 a 16:15.
  const monday = new Date();
  monday.setUTCDate(monday.getUTCDate() + 7 * (10 + Math.floor(Math.random() * 30)));
  monday.setUTCDate(monday.getUTCDate() + ((8 - monday.getUTCDay()) % 7));
  const isoDate = monday.toISOString().slice(0, 10);
  const minute = 14 * 60 + 15 * Math.floor(Math.random() * 10);
  const hhmm = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
  const clientName = `Pagamento E2E ${Date.now()}`;
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
  await page.getByRole("button", { name: new RegExp(clientName) }).first().click();
  const drawer = page.getByRole("dialog", { name: corte.name });
  await expect(drawer.getByText("Pendente")).toBeVisible();

  // Concluir abre o recebimento; recebe só R$ 30 em dinheiro.
  await drawer.getByRole("button", { name: "Concluir", exact: true }).click();
  await expect(drawer.getByText("Concluir e receber")).toBeVisible();
  const amount = drawer.getByLabel("Valor recebido");
  await amount.fill("");
  await amount.pressSequentially("3000");
  await expect(amount).toHaveValue("30,00");
  await expect(drawer.getByText("ainda faltam R$ 20,00")).toBeVisible();
  await drawer.getByRole("radio", { name: "Dinheiro" }).click();
  await drawer.getByRole("button", { name: "Concluir e registrar" }).click();
  await expect(page.getByText("Atendimento concluído e pagamento registrado.")).toBeVisible();
  await expect(drawer.getByText("Parcial")).toBeVisible();

  // Saldo de R$ 20 no PIX → pago.
  await drawer.getByRole("button", { name: "Registrar pagamento" }).click();
  await expect(drawer.getByLabel("Valor recebido")).toHaveValue("20,00");
  await drawer.getByRole("button", { name: "Registrar pagamento" }).last().click();
  await expect(page.getByText("Pagamento registrado.")).toBeVisible();
  await expect(drawer.getByText("Pago", { exact: true })).toBeVisible();

  // Remover o recebimento em dinheiro (com confirmação) → volta a parcial.
  await drawer.getByRole("button", { name: "Remover recebimento de R$ 30,00" }).click();
  const confirm = page.getByRole("dialog", { name: "Remover recebimento?" });
  await confirm.getByRole("button", { name: "Remover recebimento" }).click();
  await expect(page.getByText("Recebimento removido.")).toBeVisible();
  await expect(drawer.getByText("Parcial")).toBeVisible();

  // Quita de novo para não deixar pendência no banco local.
  await drawer.getByRole("button", { name: "Registrar pagamento" }).click();
  await drawer.getByRole("button", { name: "Registrar pagamento" }).last().click();
  await expect(drawer.getByText("Pago", { exact: true })).toBeVisible();
});
