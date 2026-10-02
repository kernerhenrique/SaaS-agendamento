import { execSync } from "node:child_process";

import { expect, test } from "@playwright/test";

import { findFreeSlot } from "./helpers";

/**
 * Fase 7 (B2): demonstração. `novo-cliente --demo` cria uma prévia com dados
 * de exemplo; a página pública tem a faixa e o botão que entra no painel sem
 * senha; o painel mostra a faixa de demonstração e recusa o que mudaria a demo
 * para os próximos visitantes. Cada execução cria uma prévia nova (expira em 7 dias).
 */
test("demo: página com faixa, painel sem senha, dados de exemplo e ações perigosas bloqueadas", async ({ page, request }) => {
  const output = execSync(`npm run novo-cliente --silent -- docs/demo-aprazzo.json --demo --slug e2e-${Date.now().toString(36)} --json`, {
    encoding: "utf8",
  });
  const demo = JSON.parse(output.trim().split("\n").at(-1)!) as { ok: boolean; slug: string; expiresAt: string };
  expect(demo.ok).toBe(true);
  expect(demo.slug).toMatch(/-demo$/);
  expect(new Date(demo.expiresAt).getTime()).toBeGreaterThan(Date.now() + 6 * 24 * 60 * 60 * 1000);

  // Página pública: fora das buscas, com a faixa e o botão.
  await page.goto(`/${demo.slug}`);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByText("Demonstração da Aprazzo.")).toBeVisible();
  await page.getByRole("button", { name: "Ver o painel da demonstração" }).click();

  // Painel do dono visitante, com a faixa e os dados de exemplo.
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText("Você está numa demonstração.")).toBeVisible();
  const api = page.request;
  const clients = (await (await api.get("/api/admin/clients")).json()).clients as unknown[];
  expect(clients.length).toBeGreaterThan(10);
  const professionals = (await (await api.get("/api/admin/professionals")).json()).professionals as { id: string; name: string }[];
  expect(professionals).toHaveLength(3);

  // Bloqueado: configurações, senha, apagar cadastro e convites.
  const blocked = [
    await api.patch("/api/admin/business", { data: { secao: "negocio", name: "Invadida" } }),
    await api.post("/api/admin/auth/password", { data: { currentPassword: "x", newPassword: "nova-senha-123" } }),
    await api.delete(`/api/admin/professionals/${professionals[0].id}`),
    await api.post(`/api/admin/staff/${professionals[0].id}/invite`),
  ];
  for (const response of blocked) {
    expect(response.status()).toBe(403);
    expect((await response.json()).error).toContain("Na demonstração");
  }

  // Liberado: o visitante reserva pela página pública (e nada é enviado por e-mail).
  const business = (await (await api.get("/api/admin/business")).json()).business as { id: string };
  const services = (await (await api.get("/api/admin/services")).json()).services as { id: string; name: string }[];
  const corte = services.find((s) => s.name === "Corte de cabelo")!;
  const carlos = professionals.find((p) => p.name === "Carlos Mendes")!;
  const { startAt } = await findFreeSlot(request, { businessId: business.id, serviceId: corte.id, professionalId: carlos.id, weekday: 3 });
  const booked = await request.post("/api/public/appointments", {
    data: {
      businessId: business.id,
      professionalId: carlos.id,
      serviceId: corte.id,
      startAt,
      client: { name: "Visitante da demo", phone: "11900000099", email: "visitante@example.com" },
    },
  });
  expect(booked.status()).toBe(201);
});

test("demo: o botão sem senha não funciona em negócio de verdade, e o cron exige o segredo", async ({ request }) => {
  const realBusiness = await request.post("/api/public/demo/navalha-de-ouro/entrar", { maxRedirects: 0 });
  expect(realBusiness.status()).toBe(404);
  expect((await request.get("/api/cron/demos")).status()).toBe(401);
  expect((await request.get("/api/cron/demos", { headers: { authorization: "Bearer chute" } })).status()).toBe(401);
});
