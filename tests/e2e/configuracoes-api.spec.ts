import { expect, test } from "@playwright/test";

import { loginAsOwner } from "./helpers";

/** Bloco 6A: API de Configurações (por seção) e troca de senha. Tudo restaurado no fim. */

test("configurações validam e salvam por seção, e o horário de funcionamento é substituído", async ({ page }) => {
  await loginAsOwner(page);
  const api = page.request;
  const original = (await (await api.get("/api/admin/business")).json()).business;
  expect(original.slug).toBe("navalha-de-ouro");

  try {
    // Validação: cor fora do formato e nicho inexistente.
    const badColor = await api.patch("/api/admin/business", {
      data: { secao: "identidade", logoUrl: null, coverUrl: null, accentColor: "vermelho" },
    });
    expect(badColor.status()).toBe(400);
    expect((await badColor.json()).error).toContain("#RRGGBB");
    // O nicho é definido na criação do cliente: a tela não troca (campo ignorado).
    const typeAttempt = await api.patch("/api/admin/business", {
      data: { secao: "negocio", name: original.name, address: original.address, whatsapp: original.whatsapp, instagramUrl: original.instagramUrl, businessType: "tattoo_studio" },
    });
    expect(typeAttempt.status()).toBe(200);
    expect((await typeAttempt.json()).business.businessType).toBe(original.businessType);

    // Negócio: Instagram por @ vira link; WhatsApp vira só dígitos.
    const saved = await api.patch("/api/admin/business", {
      data: {
        secao: "negocio",
        name: original.name,
        address: original.address,
        whatsapp: "(11) 97777-0000",
        instagramUrl: "@navalha.teste",
      },
    });
    expect(saved.status()).toBe(200);
    const business = (await saved.json()).business;
    expect(business.whatsapp).toBe("11977770000");
    expect(business.instagramUrl).toBe("https://instagram.com/navalha.teste");

    // Horário que deixaria a equipe de fora (só sábado de manhã): recusado, dizendo quem.
    const narrow = await api.put("/api/admin/business/hours", {
      data: { hours: [{ weekday: "SATURDAY", startMinute: 8 * 60, endMinute: 14 * 60 }] },
    });
    expect(narrow.status()).toBe(400);
    expect((await narrow.json()).error).toMatch(/João Barbeiro.*Marcos Estilista/);

    // Horário de funcionamento que cabe a equipe: a semana inteira é substituída.
    const week = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"].map((weekday) => ({
      weekday,
      startMinute: 8 * 60,
      endMinute: 20 * 60,
    }));
    const hours = await api.put("/api/admin/business/hours", { data: { hours: week } });
    expect(hours.status()).toBe(200);
    expect((await hours.json()).business.workingHours).toHaveLength(6);
  } finally {
    await api.patch("/api/admin/business", {
      data: {
        secao: "negocio",
        name: original.name,
        address: original.address,
        whatsapp: original.whatsapp,
        instagramUrl: original.instagramUrl,
      },
    });
    await api.put("/api/admin/business/hours", { data: { hours: original.workingHours } });
  }
});

test("trocar senha exige a atual, mantém esta sessão e derruba as outras", async ({ page, browser }) => {
  await loginAsOwner(page);
  const other = await browser.newPage();
  await loginAsOwner(other);

  const change = (currentPassword: string, newPassword: string) =>
    page.request.post("/api/admin/auth/password", { data: { currentPassword, newPassword } });

  const wrong = await change("senha-errada", "outra-senha-1");
  expect(wrong.status()).toBe(400);
  expect((await wrong.json()).error).toBe("Senha atual incorreta");
  expect((await change("senha123", "curta")).status()).toBe(400);

  try {
    expect((await change("senha123", "nova-senha-e2e")).status()).toBe(200);

    // Esta sessão segue; a outra cai assim que o access token dela expira.
    expect((await page.request.get("/api/admin/professionals")).status()).toBe(200);
    await other.context().clearCookies({ name: "access_token" });
    await other.goto("/admin/agenda");
    await expect(other).toHaveURL(/\/admin\/login/);
  } finally {
    expect((await change("nova-senha-e2e", "senha123")).status()).toBe(200);
    await other.close();
  }
});
