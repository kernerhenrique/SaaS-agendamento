import { expect, test } from "@playwright/test";

/**
 * Páginas de aviso (auditoria antes do lançamento): endereço que não existe, link
 * do cliente vencido, convite usado e link de senha vencido. Todas em português,
 * com título, explicação e um caminho para sair.
 */
test("endereço inexistente e links vencidos mostram aviso em português com saída", async ({ page }) => {
  // Negócio com o link digitado errado: nada de "This page could not be found".
  const missing = await page.goto("/barbearia-que-nao-existe-123");
  expect(missing?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Página não encontrada" })).toBeVisible();
  await expect(page.getByText("This page could not be found")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Ir para a página inicial" })).toHaveAttribute("href", "/");

  // Link de agendamento que não existe (ou venceu): explica e não revela nada.
  await page.goto("/agendamento/00000000-0000-4000-8000-000000000000/gerenciar");
  await expect(page.getByRole("heading", { level: 1, name: "Link inválido ou expirado" })).toBeVisible();
  await expect(page.getByText(/fale com o estabelecimento/)).toBeVisible();

  // Convite inválido ou já usado: quem já criou o acesso tem como entrar.
  await page.goto("/admin/convite/token-que-nao-existe");
  await expect(page.getByRole("heading", { level: 1, name: "Convite inválido ou expirado" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Já criei meu acesso: entrar" })).toHaveAttribute("href", "/admin/login");

  // Link de senha nova vencido: pedir outro.
  await page.goto("/admin/redefinir-senha/token-que-nao-existe");
  await expect(page.getByRole("heading", { level: 1, name: "Link inválido ou expirado" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Pedir um link novo" })).toHaveAttribute("href", "/admin/esqueci-senha");

  // Login tem título para o leitor de tela.
  await page.goto("/admin/login");
  await expect(page.getByRole("heading", { level: 1, name: "Entrar" })).toBeVisible();
});
