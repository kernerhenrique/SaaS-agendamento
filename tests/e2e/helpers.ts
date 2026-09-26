import { expect, type Page } from "@playwright/test";

/** Entra no painel com o dono do seed (prisma/seed.ts). */
export async function loginAsOwner(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill("dono@navalhadeouro.com");
  await page.getByLabel("Senha").fill("senha123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}
