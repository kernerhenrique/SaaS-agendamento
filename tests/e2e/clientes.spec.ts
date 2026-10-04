import { expect, test } from "@playwright/test";

import { findFreeSlot, loginAsOwner } from "./helpers";

/**
 * Clientes (Bloco E4): corrigir dados, filtro por tag, aviso ao fechar sem
 * salvar e exclusão a pedido (apaga os dados e cancela os agendamentos futuros).
 */
test("corrigir dados, tag, aviso de não salvo e excluir cliente", async ({ page }) => {
  await loginAsOwner(page);
  const api = page.request;
  const services = (await (await api.get("/api/admin/services")).json()).services as { id: string; name: string; businessId: string }[];
  const professionals = (await (await api.get("/api/admin/professionals")).json()).professionals as { id: string; name: string }[];
  const corte = services.find((s) => s.name === "Corte de cabelo")!;
  const joao = professionals.find((p) => p.name === "João Barbeiro")!;
  const stamp = Date.now();
  const name = `Cliente E4 ${stamp}`;
  const phone = `119${String(stamp).slice(-8)}`;
  const slot = await findFreeSlot(api, { businessId: corte.businessId, serviceId: corte.id, professionalId: joao.id, weekday: 3 });
  const created = await api.post("/api/admin/appointments", {
    data: { professionalId: joao.id, serviceId: corte.id, startAt: slot.startAt, client: { name, phone } },
  });
  expect(created.status()).toBe(201);
  const appointmentId = (await created.json()).appointment.id as string;
  const clientId = (await (await api.get(`/api/admin/clients/lookup?phone=${phone}`)).json()).client.id as string;

  await page.goto(`/admin/clientes?q=${encodeURIComponent(name)}&cliente=${clientId}`);
  const drawer = page.getByRole("dialog", { name });

  // Tag digitada e não salva: fechar pergunta; "Continuar editando" mantém, "Descartar" perde.
  await drawer.getByLabel("Tags").fill("Teste E4");
  await drawer.getByLabel("Tags").press("Enter");
  await expect(drawer.getByText("Alterações ainda não salvas")).toBeVisible();
  await page.keyboard.press("Escape");
  const leave = page.getByRole("dialog", { name: "Sair sem salvar?" });
  await leave.getByRole("button", { name: "Continuar editando" }).click();
  await expect(drawer.getByText("Teste E4")).toBeVisible();
  await drawer.getByRole("button", { name: "Salvar notas e tags" }).click();
  await expect(page.getByText("Ficha atualizada.")).toBeVisible();

  // Corrigir dados (só o dono): nome novo e WhatsApp novo.
  const newName = `${name} Corrigido`;
  const newPhone = `118${String(stamp).slice(-8)}`;
  await drawer.getByRole("button", { name: "Corrigir dados" }).click();
  await drawer.getByLabel("Nome", { exact: true }).fill(newName);
  await drawer.getByLabel("WhatsApp", { exact: true }).fill(newPhone);
  await drawer.getByRole("button", { name: "Salvar dados" }).click();
  await expect(page.getByText("Dados do cadastro atualizados.")).toBeVisible();
  // Telefone de outro cadastro: recusado dizendo de quem.
  await drawer.getByRole("button", { name: "Corrigir dados" }).click();
  await drawer.getByLabel("WhatsApp", { exact: true }).fill("11988887777");
  await drawer.getByRole("button", { name: "Salvar dados" }).click();
  await expect(drawer.getByText(/já é do cadastro "Maria Cliente"/)).toBeVisible();
  await drawer.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.keyboard.press("Escape");

  // Filtro por tag.
  await page.goto(`/admin/clientes?tag=${encodeURIComponent("Teste E4")}`);
  await expect(page.getByRole("button", { name: newName }).first()).toBeVisible();
  await expect(page.getByText("Maria Cliente")).toHaveCount(0);

  // Excluir: avisa do agendamento futuro, cancela e some da lista.
  await page.getByRole("button", { name: newName }).first().click();
  const drawer2 = page.getByRole("dialog", { name: newName });
  await drawer2.getByRole("button", { name: "Excluir cliente" }).click();
  const confirm = page.getByRole("dialog", { name: `Excluir ${newName}?` });
  await expect(confirm).toContainText("agendamento futuro dele será cancelado");
  await confirm.getByRole("button", { name: "Excluir cliente" }).click();
  await expect(page.getByText(/Cliente excluído\. 1 agendamento futuro foi cancelado/)).toBeVisible();
  expect((await (await api.get(`/api/admin/clients?q=${encodeURIComponent(newName)}`)).json()).clients).toHaveLength(0);
  expect((await api.get(`/api/admin/clients/${clientId}`)).status()).toBe(404);

  // O atendimento continua (cancelado), sem os dados pessoais.
  const detail = await (await api.get(`/api/admin/appointments/${appointmentId}`)).json();
  expect(detail.appointment.status).toBe("CANCELLED");
  expect(detail.appointment.client.name).toBe("Cliente excluído");
  expect(detail.appointment.client.email).toBeNull();
  // O número ficou livre: a mesma pessoa pode voltar como cliente novo.
  expect((await (await api.get(`/api/admin/clients/lookup?phone=${newPhone}`)).json()).client).toBeNull();
});
