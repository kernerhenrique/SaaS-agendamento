import { execSync } from "node:child_process";

import { expect, test } from "@playwright/test";

import { findFreeSlot, loginAsOwner, loginAsProfessional } from "./helpers";

/**
 * Bloco C (pronto para vender): recuperar senha, aviso de reserva nova no
 * Início e as páginas de termos e privacidade.
 */

const JOAO = { email: "joao@navalhadeouro.com", password: "senha123" };

function supportResetPath(email: string): string {
  const output = execSync(`npm run link-senha --silent -- ${email}`, { encoding: "utf8" });
  const match = /\/admin\/redefinir-senha\/[\w-]+/.exec(output);
  if (!match) throw new Error(`link-senha não devolveu o link: ${output}`);
  return match[0];
}

test("esqueci minha senha: resposta igual para qualquer e-mail; o link troca a senha, entra e não serve de novo", async ({ page, request, browser }) => {
  // O João precisa de acesso ativo (outros testes de equipe terminam revogando): convite pelo fluxo real.
  const owner = await browser.newPage();
  await loginAsOwner(owner);
  const professionals = (await (await owner.request.get("/api/admin/professionals")).json()).professionals as { id: string; name: string }[];
  const joaoId = professionals.find((p) => p.name === "João Barbeiro")!.id;
  await (await loginAsProfessional(browser, owner.request, joaoId, { name: "João Barbeiro", ...JOAO })).close();
  await owner.close();

  // Pedido pela tela: mesma resposta para e-mail que existe e que não existe.
  for (const email of [JOAO.email, "ninguem.aqui@example.com"]) {
    const response = await request.post("/api/admin/auth/forgot-password", { data: { email } });
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  }

  // Link (pelo comando de suporte, já que o e-mail não é lido no teste).
  const resetPath = supportResetPath(JOAO.email);
  await page.goto("/admin/login");
  await page.getByRole("link", { name: "Esqueci minha senha" }).click();
  await expect(page).toHaveURL(/\/admin\/esqueci-senha$/);
  await expect(page.getByRole("button", { name: "Enviar link" })).toBeVisible();

  await page.goto(resetPath);
  await expect(page.getByText(/Olá, João/)).toBeVisible();
  await page.getByLabel("Senha nova", { exact: true }).fill("senha-nova-do-joao");
  await page.getByLabel("Confirmar senha nova").fill("senha-nova-do-joao");
  await page.getByRole("button", { name: "Salvar e entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  // A senha antiga deixou de valer; o link não serve de novo.
  const oldLogin = await request.post("/api/admin/auth/login", { data: JOAO });
  expect(oldLogin.status()).not.toBe(200);
  expect((await request.get(`/api/public/password-reset/${resetPath.split("/").at(-1)}`)).status()).toBe(404);

  // Volta a senha do seed para os outros testes.
  const restore = await page.request.post("/api/admin/auth/password", {
    data: { currentPassword: "senha-nova-do-joao", newPassword: JOAO.password },
  });
  expect(restore.status()).toBe(200);
});

test("reserva feita pela página aparece como novidade no Início do dono", async ({ page, request }) => {
  await loginAsOwner(page);
  const api = page.request;
  const services = (await (await api.get("/api/admin/services")).json()).services as { id: string; name: string; businessId: string }[];
  const professionals = (await (await api.get("/api/admin/professionals")).json()).professionals as { id: string; name: string }[];
  const corte = services.find((s) => s.name === "Corte de cabelo")!;
  const joao = professionals.find((p) => p.name === "João Barbeiro")!;
  const { startAt } = await findFreeSlot(request, { businessId: corte.businessId, serviceId: corte.id, professionalId: joao.id, weekday: 4 });
  const clientName = `Online ${Date.now().toString(36)}`;
  const booked = await request.post("/api/public/appointments", {
    data: { businessId: corte.businessId, professionalId: joao.id, serviceId: corte.id, startAt, client: { name: clientName, phone: `119${Date.now().toString().slice(-8)}` } },
  });
  expect(booked.status()).toBe(201);

  // Reserva do cliente já nasce confirmada (o link serve para cancelar ou remarcar).
  const { id } = (await booked.json()).appointment as { id: string };
  const detail = (await (await api.get(`/api/admin/appointments/${id}`)).json()).appointment as { status: string };
  expect(detail.status).toBe("CONFIRMED");

  await page.goto("/admin");
  await expect(page.getByText(/reservas? novas? pela página/)).toBeVisible();
  // Cada reserva da lista abre o agendamento no drawer.
  await page.getByRole("button", { name: new RegExp(clientName) }).click();
  await expect(page.getByRole("dialog", { name: corte.name })).toBeVisible();
});

test("termos e privacidade abrem e estão no rodapé da página de reservas", async ({ page }) => {
  await page.goto("/navalha-de-ouro");
  await expect(page.getByRole("link", { name: "Privacidade" })).toHaveAttribute("href", "/privacidade");
  await expect(page.getByRole("link", { name: "Termos" })).toHaveAttribute("href", "/termos");

  await page.goto("/privacidade");
  await expect(page.getByRole("heading", { name: "Política de privacidade" })).toBeVisible();
  await expect(page.getByText(/LGPD/).first()).toBeVisible();
  await page.goto("/termos");
  await expect(page.getByRole("heading", { name: "Termos de uso" })).toBeVisible();
});
