import { expect, test } from "@playwright/test";

import { findFreeSlot, loginAsOwner } from "./helpers";

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
    businessId: string;
  }[];
  const joao = professionals.find((p) => p.name === "João Barbeiro")!;
  const corte = services.find((s) => s.name === "Corte de cabelo")!;

  // Um horário livre de verdade numa sexta distante.
  const slot = await findFreeSlot(page.request, {
    businessId: corte.businessId,
    serviceId: corte.id,
    professionalId: joao.id,
    weekday: 5,
  });
  const isoDate = slot.date;
  const clientName = `Pagamento E2E ${Date.now()}`;
  const created = await page.request.post("/api/admin/appointments", {
    data: {
      professionalId: joao.id,
      serviceId: corte.id,
      startAt: slot.startAt,
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
