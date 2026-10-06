import { expect, test } from "@playwright/test";

import { moveToPast } from "./db";
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
  // "Concluir" só vale depois do início: o atendimento passa para ontem.
  const { date: isoDate } = await moveToPast((await created.json()).appointment.id as string);

  await page.goto(`/admin/agenda?date=${isoDate}`);
  await page.getByRole("button", { name: new RegExp(clientName) }).first().click();
  const drawer = page.getByRole("dialog", { name: corte.name });
  await expect(drawer.getByText("A receber")).toBeVisible();

  // Concluir abre o recebimento com "Recebido agora" em zero; recebe só R$ 30 em dinheiro.
  await drawer.getByRole("button", { name: "Concluir", exact: true }).click();
  await expect(drawer.getByText("Concluir e receber")).toBeVisible();
  const amount = drawer.getByLabel("Recebido agora");
  await expect(amount).toHaveValue("0,00");
  await expect(drawer.getByText("falta R$ 50,00")).toBeVisible();
  await amount.fill("");
  await amount.pressSequentially("3000");
  await expect(amount).toHaveValue("30,00");
  await expect(drawer.getByText("ainda faltam R$ 20,00")).toBeVisible();
  await drawer.getByRole("radio", { name: "Dinheiro" }).click();
  await drawer.getByRole("button", { name: "Concluir e registrar" }).click();
  await expect(page.getByText("Atendimento concluído e pagamento registrado.")).toBeVisible();
  await expect(drawer.getByText("Parcial")).toBeVisible();

  // Erro comum: digitar o TOTAL pago (R$ 50) em vez do que entrou agora. Recusado, explicando.
  await drawer.getByRole("button", { name: "Registrar pagamento" }).click();
  await expect(drawer.getByText("já recebido R$ 30,00")).toBeVisible();
  const again = drawer.getByLabel("Recebido agora");
  await again.fill("");
  await again.pressSequentially("5000");
  await expect(drawer.getByText(/Faltam só R\$ 20,00\. Informe só o que o cliente pagou agora/).first()).toBeVisible();
  // "Recebeu tudo" preenche os R$ 20 que faltam → pago.
  await drawer.getByRole("button", { name: "Recebeu tudo (R$ 20,00)" }).click();
  await expect(again).toHaveValue("20,00");
  await drawer.getByRole("button", { name: "Registrar pagamento" }).last().click();
  await expect(page.getByText("Pagamento registrado.")).toBeVisible();
  await expect(drawer.getByText("Pago", { exact: true })).toBeVisible();

  // Remover o recebimento em dinheiro (com confirmação) → volta a parcial.
  await drawer.getByRole("button", { name: "Remover recebimento de R$ 30,00" }).click();
  const confirm = page.getByRole("dialog", { name: "Remover recebimento?" });
  await confirm.getByRole("button", { name: "Remover recebimento" }).click();
  await expect(page.getByText("Recebimento removido.")).toBeVisible();
  await expect(drawer.getByText("Parcial")).toBeVisible();

  // Só desconto: com o recebido em zero, basta digitar o desconto (R$ 10 dos R$ 30 que faltam).
  await drawer.getByRole("button", { name: "Registrar pagamento" }).click();
  const discount = drawer.getByLabel("Desconto");
  await discount.fill("");
  await discount.pressSequentially("1000");
  await expect(drawer.getByText("ainda faltam R$ 20,00")).toBeVisible();
  await drawer.getByRole("button", { name: "Registrar pagamento" }).last().click();
  await expect(drawer.getByText("Desconto de R$ 10,00")).toBeVisible();

  // Quita o resto com "Recebeu tudo" para não deixar pendência no banco local.
  await drawer.getByRole("button", { name: "Registrar pagamento" }).click();
  await drawer.getByRole("button", { name: "Recebeu tudo (R$ 20,00)" }).click();
  await drawer.getByRole("button", { name: "Registrar pagamento" }).last().click();
  await expect(drawer.getByText("Pago", { exact: true })).toBeVisible();
});
