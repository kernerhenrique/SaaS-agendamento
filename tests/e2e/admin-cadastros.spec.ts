import { expect, test } from "@playwright/test";

import { loginAsOwner } from "./helpers";

/**
 * Bloco 3D: Clientes (ficha, notas/tags, busca de telefone no encaixe),
 * Profissionais (perfil) e Serviços (visibilidade na página pública).
 * Usa os dados do seed e desfaz o que altera.
 */

test("ficha do cliente salva tags e o encaixe reconhece o telefone já cadastrado", async ({ page }) => {
  await loginAsOwner(page);
  const lookup = await (await page.request.get("/api/admin/clients/lookup?phone=11977776666")).json();
  const pedroId = lookup.client.id as string;
  const before = await (await page.request.get(`/api/admin/clients/${pedroId}`)).json();

  try {
    await page.goto("/admin/clientes?q=pedro");
    await page.getByRole("button", { name: "Pedro Cliente" }).first().click();
    const drawer = page.getByRole("dialog", { name: "Pedro Cliente" });
    const tag = `e2e-${Date.now().toString().slice(-6)}`;
    const tagInput = drawer.getByRole("textbox", { name: "Tags" });
    await tagInput.fill(tag);
    await tagInput.press("Enter");
    await drawer.getByRole("button", { name: "Salvar notas e tags" }).click();
    await expect(page.getByText("Ficha atualizada.")).toBeVisible();
    const saved = await (await page.request.get(`/api/admin/clients/${pedroId}`)).json();
    expect(saved.client.tags).toContain(tag);

    // "Novo agendamento" da ficha: telefone preenchido e cliente reconhecido.
    await drawer.getByRole("button", { name: "Novo agendamento" }).click();
    const dialog = page.getByRole("dialog", { name: "Novo agendamento" });
    await expect(dialog.getByText("Já cadastrado:")).toBeVisible();
    await dialog.getByLabel(/^Nome/).fill("Outro Nome");
    await expect(dialog.getByText(/O cadastro será atualizado/)).toBeVisible();
    await dialog.getByRole("button", { name: "Manter Pedro Cliente" }).click();
    await expect(dialog.getByLabel(/^Nome/)).toHaveValue("Pedro Cliente");
    await page.keyboard.press("Escape");
  } finally {
    // Desfaz a tag mesmo se algo acima falhar.
    const restored = await page.request.patch(`/api/admin/clients/${pedroId}`, {
      data: { internalNotes: before.client.internalNotes, tags: before.client.tags },
    });
    expect(restored.status()).toBe(200);
  }
});

test("perfil do profissional mostra próximos, desempenho e dados", async ({ page }) => {
  await loginAsOwner(page);
  await page.goto("/admin/profissionais");
  await page.getByRole("link", { name: /João Barbeiro/ }).click();
  await expect(page.getByRole("heading", { name: "João Barbeiro" })).toBeVisible();

  await page.getByRole("tab", { name: "Desempenho" }).click();
  await expect(page.getByText("Ocupação", { exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "Dados" }).click();
  await expect(page.getByText("Cor na agenda")).toBeVisible();
  await expect(page.getByRole("switch", { name: "Ativo" })).toBeChecked();
});

test("serviço oculto some da página pública e não pode ser reservado", async ({ page }) => {
  await loginAsOwner(page);
  const services = (await (await page.request.get("/api/admin/services")).json()).services as {
    id: string;
    name: string;
    businessId: string;
  }[];
  const professionals = (await (await page.request.get("/api/admin/professionals")).json()).professionals as {
    id: string;
  }[];
  const coloracao = services.find((s) => s.name === "Coloração")!;

  await page.goto("/admin/servicos");
  const toggle = page.getByRole("switch", { name: "Coloração visível na página pública" }).first();
  await toggle.click();
  await expect(page.getByText("Não aparece mais na página pública: Coloração.")).toBeVisible();

  try {
    const publicPage = await page.request.get("/navalha-de-ouro");
    const html = await publicPage.text();
    expect(html).not.toContain("Coloração");
    expect(html).toContain("Corte de cabelo");

    // Nem chamando a API pública direto.
    const booking = await page.request.post("/api/public/appointments", {
      data: {
        businessId: coloracao.businessId,
        professionalId: professionals[0].id,
        serviceId: coloracao.id,
        startAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        client: { name: "Oculto E2E", phone: `119${Date.now().toString().slice(-8)}` },
      },
    });
    expect(booking.status()).toBe(404);
  } finally {
    const restored = await page.request.patch(`/api/admin/services/${coloracao.id}/visibility`, {
      data: { visibleOnline: true },
    });
    expect(restored.status()).toBe(200);
  }
});
