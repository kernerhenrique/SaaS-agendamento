import { expect, test } from "@playwright/test";

import { moveToPast } from "./db";
import { findFreeSlot, loginAsOwner } from "./helpers";

/** Pagou antes de concluir: "Concluir" não pede o pagamento de novo; o "Recebeu tudo" cabe no formulário. */
test("pago antes de concluir: um clique para concluir; botão Recebeu tudo dentro do formulário", async ({ page }) => {
  await loginAsOwner(page);
  const api = page.request;
  const professionals = (await (await api.get("/api/admin/professionals")).json()).professionals as { id: string; name: string }[];
  const services = (await (await api.get("/api/admin/services")).json()).services as { id: string; name: string; businessId: string }[];
  const joao = professionals.find((p) => p.name === "João Barbeiro")!;
  const corte = services.find((s) => s.name === "Corte de cabelo")!;
  const slot = await findFreeSlot(api, { businessId: corte.businessId, serviceId: corte.id, professionalId: joao.id, weekday: 2 });
  const name = `Pago Antes ${Date.now()}`;
  const created = await api.post("/api/admin/appointments", {
    data: { professionalId: joao.id, serviceId: corte.id, startAt: slot.startAt, client: { name, phone: `119${Date.now().toString().slice(-8)}` } },
  });
  const id = (await created.json()).appointment.id as string;
  const { date } = await moveToPast(id);
  // Sinal de R$ 20 e o resto (R$ 30) antes de concluir.
  const pay = (amountCents: number) =>
    api.post(`/api/admin/appointments/${id}/payments`, { data: { amountCents, discountCents: 0, method: "PIX", receivedAt: new Date().toISOString() } });
  expect((await pay(2000)).status()).toBe(201);

  await page.goto(`/admin/agenda?date=${date}`);
  await page.getByRole("button", { name: new RegExp(name) }).filter({ visible: true }).first().click({ force: true });
  const drawer = page.getByRole("dialog", { name: corte.name });
  // Parcial: o formulário abre com o que falta e "Concluir sem receber mais"; o botão cabe no quadro.
  await drawer.getByRole("button", { name: "Concluir", exact: true }).click();
  await expect(drawer.getByRole("button", { name: "Concluir sem receber mais" })).toBeVisible();
  const fill = drawer.getByRole("button", { name: "Recebeu tudo (R$ 30,00)" });
  const form = drawer.locator("form").filter({ hasText: "Concluir e receber" });
  const [fillBox, formBox] = [await fill.boundingBox(), await form.boundingBox()];
  expect(fillBox!.x + fillBox!.width).toBeLessThanOrEqual(formBox!.x + formBox!.width);
  await drawer.getByRole("button", { name: "Voltar" }).click();

  // Quitado antes de concluir: um clique, sem pedir pagamento.
  expect((await pay(3000)).status()).toBe(201);
  await page.keyboard.press("Escape");
  await page.reload();
  await page.getByRole("button", { name: new RegExp(name) }).filter({ visible: true }).first().click({ force: true });
  await drawer.getByRole("button", { name: "Concluir", exact: true }).click();
  await expect(drawer.getByText("Pagamento já registrado (R$ 50,00).", { exact: false })).toBeVisible();
  await expect(drawer.getByLabel("Recebido agora")).toHaveCount(0);
  await drawer.getByRole("button", { name: "Concluir atendimento" }).click();
  await expect(page.getByText("Atendimento concluído.")).toBeVisible();
  await expect(drawer.getByText("Concluído", { exact: true }).first()).toBeVisible();
});

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
  // Toque no começo do campo (cursor longe do fim): o valor continua entrando pela direita.
  const box = (await amount.boundingBox())!;
  await amount.click({ position: { x: box.width - 30, y: box.height / 2 } });
  await page.keyboard.press("Home");
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

/** Início: atendimento que já passou sem desfecho aparece no quadro Atenção e abre o drawer sem sair da tela. */
test("Início avisa atendimento passado sem desfecho e o item abre o drawer", async ({ page }) => {
  await loginAsOwner(page);
  const api = page.request;
  const professionals = (await (await api.get("/api/admin/professionals")).json()).professionals as { id: string; name: string }[];
  const services = (await (await api.get("/api/admin/services")).json()).services as { id: string; name: string; businessId: string }[];
  const joao = professionals.find((p) => p.name === "João Barbeiro")!;
  const corte = services.find((s) => s.name === "Corte de cabelo")!;
  const slot = await findFreeSlot(api, { businessId: corte.businessId, serviceId: corte.id, professionalId: joao.id, weekday: 3 });
  const name = `Sem Desfecho ${Date.now()}`;
  const created = await api.post("/api/admin/appointments", {
    data: { professionalId: joao.id, serviceId: corte.id, startAt: slot.startAt, client: { name, phone: `119${Date.now().toString().slice(-8)}` } },
  });
  await moveToPast((await created.json()).appointment.id as string);

  await page.goto("/admin");
  const alert = page.getByText(/sem desfecho/).first();
  await expect(alert).toBeVisible();
  await page.getByRole("button", { name: new RegExp(name) }).click();
  const drawer = page.getByRole("dialog", { name: corte.name });
  await drawer.getByRole("button", { name: "Não compareceu" }).click();
  await expect(page.getByRole("button", { name: new RegExp(name) })).toHaveCount(0);
});
