import { expect, test, type Page } from "@playwright/test";

/**
 * Aviso de cookies do site da Aprazzo. O aviso não aparece para navegador automatizado
 * (senão cobriria botões nos outros testes): aqui o navegador se apresenta como o de uma pessoa.
 */
const asPerson = (page: Page) => page.addInitScript(() => Object.defineProperty(navigator, "webdriver", { get: () => false }));
const notice = (page: Page) => page.getByRole("region", { name: "Aviso de cookies" });
const storedChoice = (page: Page) => page.evaluate(() => window.localStorage.getItem("aprazzo:cookies"));

test("cookies: recusar e aceitar ficam lado a lado, a escolha é lembrada e dá para rever", async ({ page }) => {
  const google: string[] = [];
  page.on("request", (r) => /googletagmanager|google-analytics/.test(r.url()) && google.push(r.url()));
  await asPerson(page);

  await page.goto("/");
  await expect(notice(page)).toBeVisible();
  await expect(notice(page).getByRole("button", { name: "Recusar" })).toBeVisible();
  await expect(notice(page).getByRole("button", { name: "Aceitar" })).toBeVisible();
  await expect(notice(page).getByRole("link", { name: "Saiba mais" })).toHaveAttribute("href", "/privacidade#cookies");

  // Recusar: some, fica lembrado e continua sem aviso depois de recarregar.
  await notice(page).getByRole("button", { name: "Recusar" }).click();
  await expect(notice(page)).toHaveCount(0);
  expect(await storedChoice(page)).toBe("recusado");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(notice(page)).toHaveCount(0);

  // "Cookies" no rodapé traz o aviso de volta; aceitar também fica lembrado.
  await page.getByRole("contentinfo").getByRole("button", { name: "Cookies" }).click();
  await expect(notice(page)).toBeVisible();
  await notice(page).getByRole("button", { name: "Aceitar" }).click();
  await expect(notice(page)).toHaveCount(0);
  expect(await storedChoice(page)).toBe("aceito");

  // Fora do endereço de produção o Google Analytics nunca é carregado, nem com o aceite.
  await page.waitForTimeout(500);
  expect(google).toEqual([]);
});

test("cookies: o aviso aparece na demonstração e na política, mas não na página de um negócio de verdade nem no painel", async ({ page }) => {
  await asPerson(page);
  await page.goto("/demo");
  await expect(notice(page)).toBeVisible();

  await page.goto("/privacidade");
  await expect(notice(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "rever minha escolha" })).toBeVisible();

  await page.goto("/navalha-de-ouro");
  await expect(page.getByRole("heading", { name: "Escolha o serviço" })).toBeVisible();
  await expect(notice(page)).toHaveCount(0);

  await page.goto("/admin/login");
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  await expect(notice(page)).toHaveCount(0);
});

test("cookies: navegador automatizado não vê o aviso", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(notice(page)).toHaveCount(0);
});
