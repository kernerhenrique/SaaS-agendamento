import { expect, test } from "@playwright/test";

import { loginAsOwner } from "./helpers";

/** Bloco 5A (API): seções dos Relatórios coerentes com o Financeiro e exportação CSV. */
test("relatórios por seção batem com o financeiro e exportam CSV", async ({ page }) => {
  await loginAsOwner(page);
  const api = page.request;
  const range = "startDate=2026-09-01&endDate=2026-09-30";
  const section = async (secao: string) => {
    const response = await api.get(`/api/admin/reports?${range}&secao=${secao}`);
    expect(response.status(), secao).toBe(200);
    return (await response.json()).report;
  };

  // Formato antigo continua (sem secao).
  const legacy = await api.get(`/api/admin/reports?${range}`);
  expect(legacy.status()).toBe(200);
  expect((await legacy.json()).summary.byDay).toHaveLength(30);

  const atendimentos = await section("atendimentos");
  expect(atendimentos.current.byDay).toHaveLength(30);
  expect(atendimentos.previous).toHaveProperty("total");

  // Faturamento = Financeiro no mesmo período (mesma regra, data de recebimento).
  const faturamento = await section("faturamento");
  const finance = (await (await api.get(`/api/admin/finance/summary?${range}`)).json()).summary;
  expect(faturamento.current.receivedCents).toBe(finance.receivedCents);
  expect(faturamento.current.averageTicketCents).toBe(finance.averageTicketCents);
  expect(faturamento.current.byDay.reduce((s: number, d: { value: number }) => s + d.value, 0)).toBe(
    finance.receivedCents,
  );

  // Profissionais: soma do recebido e das comissões = Financeiro/Comissões.
  const profissionais = await section("profissionais");
  const commissions = (await (await api.get(`/api/admin/finance/commissions?${range}`)).json()).commissions as {
    receivedCents: number;
    commissionCents: number;
  }[];
  const sum = (rows: { receivedCents: number }[]) => rows.reduce((s, r) => s + r.receivedCents, 0);
  expect(sum(profissionais.rows)).toBe(finance.receivedCents);
  expect(profissionais.rows.reduce((s: number, r: { commissionCents: number }) => s + r.commissionCents, 0)).toBe(
    commissions.reduce((s, r) => s + r.commissionCents, 0),
  );

  const servicos = await section("servicos");
  expect(sum(servicos.rows)).toBe(finance.receivedCents);

  const clientes = await section("clientes");
  expect(clientes.current.newClients + clientes.current.returning).toBe(clientes.current.served);

  // Seção inválida e período invertido.
  expect((await api.get(`/api/admin/reports?${range}&secao=xyz`)).status()).toBe(400);
  expect((await api.get("/api/admin/reports?startDate=2026-09-30&endDate=2026-09-01&secao=faturamento")).status()).toBe(
    400,
  );

  // CSV de recebimentos: BOM, cabeçalho com ";", nome do arquivo e o seed do dia 15/09.
  const csvResponse = await api.get(`/api/admin/reports/export?tipo=recebimentos&${range}`);
  expect(csvResponse.status()).toBe(200);
  expect(csvResponse.headers()["content-type"]).toContain("text/csv");
  expect(csvResponse.headers()["content-disposition"]).toContain("recebimentos-2026-09-01-a-2026-09-30.csv");
  const csv = new TextDecoder("utf-8", { ignoreBOM: true }).decode(await csvResponse.body());
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  expect(csv).toContain("Recebido em;Cliente;Serviço;Profissional;Forma;Valor (R$);Desconto (R$);Observação");
  expect(csv).toContain("15/09/2026;Maria Cliente;Corte de cabelo;João Barbeiro;Dinheiro;45,00;5,00;");

  // CSV de comissões termina com a linha de total.
  const commissionsCsv = await (await api.get(`/api/admin/reports/export?tipo=comissoes&${range}`)).text();
  expect(commissionsCsv).toContain("Profissional;% atual;Recebido (R$);Comissão (R$);Recebimentos");
  expect(commissionsCsv.trim().split("\r\n").at(-1)).toMatch(/^Total;;/);
});
