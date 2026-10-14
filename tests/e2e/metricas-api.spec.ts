import { expect, test } from "@playwright/test";

import { siteMetricCount } from "./db";

/**
 * Medição própria do site: a rota soma 1 num contador anônimo e responde sempre 204.
 * O corpo vai como texto, do jeito que o `sendBeacon` do navegador manda.
 */
const send = (request: import("@playwright/test").APIRequestContext, body: unknown) =>
  request.post("/api/public/metric", { data: typeof body === "string" ? body : JSON.stringify(body), headers: { "Content-Type": "text/plain;charset=UTF-8" } });

test("medição: conta eventos da lista e ignora o resto, sempre com 204", async ({ request }) => {
  const before = {
    visit: await siteMetricCount("site_visit", "instagram"),
    click: await siteMetricCount("whatsapp_click", "hero"),
    demo: await siteMetricCount("demo_open", "demo"),
    fake: await siteMetricCount("demo_open", "navalha-de-ouro"),
  };

  expect((await send(request, { event: "site_visit", label: "instagram" })).status()).toBe(204);
  expect((await send(request, { event: "whatsapp_click", label: "hero" })).status()).toBe(204);
  expect((await send(request, { event: "whatsapp_click", label: "hero" })).status()).toBe(204);
  // Demonstração: só conta endereço que é mesmo uma demonstração.
  expect((await send(request, { event: "demo_open", label: "demo" })).status()).toBe(204);
  expect((await send(request, { event: "demo_open", label: "navalha-de-ouro" })).status()).toBe(204);
  // Lixo: evento inventado, detalhe fora da lista e corpo que não é JSON.
  expect((await send(request, { event: "compra", label: "hero" })).status()).toBe(204);
  expect((await send(request, { event: "site_visit", label: "tiktok" })).status()).toBe(204);
  expect((await send(request, "isto não é json")).status()).toBe(204);

  expect(await siteMetricCount("site_visit", "instagram")).toBe(before.visit + 1);
  expect(await siteMetricCount("whatsapp_click", "hero")).toBe(before.click + 2);
  expect(await siteMetricCount("demo_open", "demo")).toBe(before.demo + 1);
  expect(await siteMetricCount("demo_open", "navalha-de-ouro")).toBe(before.fake);
  expect(await siteMetricCount("site_visit", "tiktok")).toBe(0);
  expect(await siteMetricCount("compra", "hero")).toBe(0);
});

test("medição: navegador automatizado (testes, robôs) não entra na contagem", async ({ page }) => {
  const before = await siteMetricCount("site_visit", "direto");
  let sent = 0;
  page.on("request", (r) => r.url().includes("/api/public/metric") && sent++);
  await page.goto("/");
  await page.getByRole("link", { name: "Conhecer a Aprazzo pelo WhatsApp" }).first().evaluate((link) => link.addEventListener("click", (e) => e.preventDefault()));
  await page.getByRole("link", { name: "Conhecer a Aprazzo pelo WhatsApp" }).first().click();
  await page.waitForTimeout(500);
  expect(sent).toBe(0);
  expect(await siteMetricCount("site_visit", "direto")).toBe(before);
});
