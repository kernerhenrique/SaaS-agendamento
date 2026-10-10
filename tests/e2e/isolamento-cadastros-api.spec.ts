import { execSync } from "node:child_process";

import { expect, test } from "@playwright/test";

import { businessRefs } from "./db";
import { loginAsOwner } from "./helpers";

/**
 * Isolamento entre negócios nas ligações entre cadastros: o dono da Navalha não
 * consegue ligar um serviço dele a um profissional ou categoria de outro negócio,
 * nem um profissional dele a um serviço de outro negócio (corpo editado à mão).
 */
test("serviço e profissional recusam ids de outro negócio", async ({ page }) => {
  const slug = `outro-negocio-${Date.now().toString(36)}`;
  execSync(`npm run novo-cliente --silent -- tests/fixtures/cliente-solo-e2e.json --slug ${slug} --json`, { encoding: "utf8" });
  const foreign = await businessRefs(slug);

  await loginAsOwner(page);
  const api = page.request;
  const service = (name: string, extra: Record<string, unknown>) => ({
    name,
    description: null,
    durationMin: 30,
    priceCents: 1000,
    priceType: "FIXED",
    categoryId: null,
    professionalIds: [],
    ...extra,
  });

  // Serviço com profissional de outro negócio: recusado, sem revelar nada.
  const withForeignPro = await api.post("/api/admin/services", { data: service("Isolamento E2E", { professionalIds: [foreign.professionalId] }) });
  expect(withForeignPro.status()).toBe(400);
  expect((await withForeignPro.json()).error).toBe("Cadastro não encontrado");

  // Serviço com categoria de outro negócio: recusado.
  const withForeignCategory = await api.post("/api/admin/services", { data: service("Isolamento E2E", { categoryId: foreign.categoryId }) });
  expect(withForeignCategory.status()).toBe(400);

  // Profissional com serviço de outro negócio: recusado.
  const withForeignService = await api.post("/api/admin/professionals", {
    data: { name: "Isolamento E2E", active: false, serviceIds: [foreign.serviceId], workingHours: [] },
  });
  expect(withForeignService.status()).toBe(400);
  expect((await withForeignService.json()).error).toBe("Cadastro não encontrado");

  // Com os próprios cadastros, tudo continua funcionando (e ids repetidos não quebram).
  const own = (await (await api.get("/api/admin/professionals")).json()).professionals as { id: string }[];
  const ok = await api.post("/api/admin/services", { data: service("Isolamento E2E", { professionalIds: [own[0].id, own[0].id] }) });
  expect(ok.status()).toBe(201);
  await api.delete(`/api/admin/services/${(await ok.json()).service.id}`);
});
