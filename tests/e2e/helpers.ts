import { expect, type APIRequestContext, type Page } from "@playwright/test";

/** Entra no painel com o dono do seed (prisma/seed.ts). */
export async function loginAsOwner(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill("dono@navalhadeouro.com");
  await page.getByLabel("Senha").fill("senha123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

/**
 * Um horário LIVRE de verdade (pergunta à própria disponibilidade), num dia
 * da semana a partir de `minWeeks` semanas à frente. Evita que testes que
 * deixam atendimentos no banco local colidam entre si com horários sorteados.
 * `weekday`: 0 = domingo … 6 = sábado.
 */
export async function findFreeSlot(
  request: APIRequestContext,
  params: { businessId: string; serviceId: string; professionalId: string; weekday: number; minWeeks?: number },
): Promise<{ date: string; startAt: string }> {
  const minWeeks = params.minWeeks ?? 8;
  for (let week = 0; week < 60; week++) {
    const day = new Date();
    day.setUTCDate(day.getUTCDate() + 7 * (minWeeks + week));
    day.setUTCDate(day.getUTCDate() + ((params.weekday + 7 - day.getUTCDay()) % 7));
    const date = day.toISOString().slice(0, 10);
    const response = await request.get(
      `/api/availability?businessId=${params.businessId}&serviceId=${params.serviceId}&professionalId=${params.professionalId}&date=${date}`,
    );
    const { slots } = (await response.json()) as { slots?: { startAt: string }[] };
    if (slots && slots.length > 0) {
      return { date, startAt: slots[Math.floor(Math.random() * slots.length)].startAt };
    }
  }
  throw new Error("Nenhum horário livre encontrado para o teste");
}
