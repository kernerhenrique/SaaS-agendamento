import { expect, type APIRequestContext, type Page } from "@playwright/test";

/** Entra no painel com o dono do seed (prisma/seed.ts). */
export async function loginAsOwner(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill("dono@navalhadeouro.com");
  await page.getByLabel("Senha").fill("senha123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

/** Janela de reserva do seed (Business.maxBookingWindowDays): além dela a disponibilidade pública não oferece horário. */
export const BOOKING_WINDOW_DAYS = 60;

/** Uma data (YYYY-MM-DD) no dia da semana pedido, `weeks` semanas à frente. `weekday`: 0 = domingo … 6 = sábado. */
export function weekdayInWeeks(weekday: number, weeks: number): string {
  const day = new Date();
  day.setUTCDate(day.getUTCDate() + 7 * weeks);
  day.setUTCDate(day.getUTCDate() + ((weekday + 7 - day.getUTCDay()) % 7));
  return day.toISOString().slice(0, 10);
}

/**
 * Um horário LIVRE de verdade (pergunta à própria disponibilidade), num dia
 * da semana dentro da janela de reserva — primeiro no fim da janela, para
 * sujar menos a agenda próxima do banco local, depois nas semanas mais perto.
 * Evita que testes que deixam atendimentos no banco colidam entre si.
 */
export async function findFreeSlot(
  request: APIRequestContext,
  params: { businessId: string; serviceId: string; professionalId: string; weekday: number },
): Promise<{ date: string; startAt: string }> {
  const lastWeek = Math.floor(BOOKING_WINDOW_DAYS / 7) - 1;
  const weeks = [...Array.from({ length: lastWeek - 3 }, (_, i) => 4 + i), 3, 2, 1];
  for (const week of weeks) {
    const date = weekdayInWeeks(params.weekday, week);
    const response = await request.get(
      `/api/availability?businessId=${params.businessId}&serviceId=${params.serviceId}&professionalId=${params.professionalId}&date=${date}`,
    );
    const { slots } = (await response.json()) as { slots?: { startAt: string }[] };
    if (slots && slots.length > 0) {
      return { date, startAt: slots[Math.floor(Math.random() * slots.length)].startAt };
    }
  }
  throw new Error("Nenhum horário livre na janela de reserva; rode npx prisma migrate reset para limpar o banco local");
}
