import { expect, test } from "@playwright/test";

import { loginAsOwner } from "./helpers";

/**
 * Vários usuários, bloco C (telas): o dono gera o convite no cadastro do
 * profissional, o profissional cria o acesso pela página do convite e vê o
 * painel reduzido; o dono revoga pela tela. Acesso revogado no fim.
 */
test("convite pela tela, painel reduzido do profissional e revogar", async ({ page, browser }) => {
  await loginAsOwner(page);
  const professionals = (await (await page.request.get("/api/admin/professionals")).json()).professionals as { id: string; name: string }[];
  const marcos = professionals.find((p) => p.name === "Marcos Estilista")!;
  await page.request.delete(`/api/admin/staff/${marcos.id}`);

  const guest = await browser.newContext();
  try {
    // Dono: aba Dados › Acesso ao painel › Gerar convite.
    await page.goto(`/admin/profissionais/${marcos.id}`);
    await page.getByRole("tab", { name: "Dados" }).click();
    const card = page.getByRole("region", { name: "Acesso ao painel" });
    await card.getByRole("button", { name: "Gerar convite" }).click();
    const link = card.getByLabel("Link de convite");
    await expect(link).toHaveValue(/\/admin\/convite\/[\w-]{40,}$/);
    await expect(card.getByText("Convite enviado")).toBeVisible();
    await expect(card.getByRole("link", { name: "Enviar pelo WhatsApp" })).toHaveAttribute("href", /^https:\/\/wa\.me\/\?text=/);
    const url = new URL(await link.inputValue());

    // Profissional: abre o link sem estar logado e cria o acesso.
    const pro = await guest.newPage();
    await pro.goto(url.pathname);
    await expect(pro.getByText("convidou você como barbeiro")).toBeVisible();
    await pro.getByLabel("E-mail (para entrar)").fill("marcos.e2e@example.com");
    await pro.getByLabel("Senha", { exact: true }).fill("senha-do-marcos");
    await pro.getByLabel("Confirmar senha").fill("senha-do-marcos");
    await pro.getByRole("button", { name: "Criar acesso e entrar" }).click();
    await expect(pro).toHaveURL(/\/admin$/);

    // Painel reduzido: sem Financeiro, Relatórios nem cadastros; comissão no Início.
    const menu = pro.getByRole("navigation", { name: "Menu principal" });
    await expect(menu.getByRole("link", { name: "Agenda" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Financeiro" })).toHaveCount(0);
    await expect(menu.getByRole("link", { name: "Barbeiros" })).toHaveCount(0);
    await expect(pro.getByText("Minha comissão no mês")).toBeVisible();

    // Menu da conta (canto superior direito) abre com nome e papel — já quebrou por faltar o grupo do título.
    await pro.getByRole("button", { name: /^Conta:/ }).click();
    await expect(pro.getByRole("menu").getByText("Barbeiro", { exact: true })).toBeVisible();
    await expect(pro.getByRole("menuitem", { name: "Sair" })).toBeVisible();
    await pro.keyboard.press("Escape");

    // Telas do dono voltam ao Início; Configurações só com a Conta; Mensagens sem Modelos.
    await pro.goto("/admin/financeiro");
    await expect(pro).toHaveURL(/\/admin$/);
    await pro.goto("/admin/configuracoes");
    await expect(pro.getByRole("region", { name: "Conta" })).toBeVisible();
    await expect(pro.getByRole("region", { name: "Negócio" })).toHaveCount(0);
    await pro.goto("/admin/mensagens");
    await expect(pro.getByRole("tab", { name: "Lembretes de amanhã" })).toBeVisible();
    await expect(pro.getByRole("tab", { name: "Modelos" })).toHaveCount(0);

    // Dono: o cartão mostra o acesso ativo e revoga com confirmação.
    await page.reload();
    await page.getByRole("tab", { name: "Dados" }).click();
    await expect(card.getByText("Acesso ativo")).toBeVisible();
    await card.getByRole("button", { name: "Revogar acesso" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Revogar acesso" }).click();
    await expect(card.getByText("Acesso revogado")).toBeVisible();
  } finally {
    await page.request.delete(`/api/admin/staff/${marcos.id}`);
    await guest.close();
  }
});
