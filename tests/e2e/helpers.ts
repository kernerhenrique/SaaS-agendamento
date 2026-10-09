import { expect, type APIRequestContext, type Browser, type BrowserContext, type Page } from "@playwright/test";

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

/**
 * Dá acesso ao painel a um profissional pelo fluxo real de convite (o dono
 * gera o link, o profissional aceita) e devolve o contexto já logado como ele.
 * Reaproveita o mesmo usuário entre execuções (o aceite reativa o acesso).
 */
export async function loginAsProfessional(
  browser: Browser,
  owner: APIRequestContext,
  professionalId: string,
  account: { name: string; email: string; password: string },
): Promise<BrowserContext> {
  await owner.delete(`/api/admin/staff/${professionalId}`);
  const created = await owner.post(`/api/admin/staff/${professionalId}/invite`);
  expect(created.status()).toBe(201);
  const token = ((await created.json()).invite.url as string).split("/admin/convite/")[1];
  const context = await browser.newContext();
  const accepted = await context.request.post(`/api/public/staff-invite/${token}`, { data: account });
  expect(accepted.status(), await accepted.text()).toBe(201);
  return context;
}

/** Hoje + N dias (YYYY-MM-DD) no fuso do negócio do seed. */
export function localDateInDays(days: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + days * 86_400_000));
}

/**
 * Encaixe à noite (fora do expediente, com confirmação) num minuto livre:
 * tenta horários de 15 em 15 min a partir das 20:00 até achar um vago.
 */
export async function createEveningAppointment(
  api: APIRequestContext,
  params: { professionalId: string; serviceId: string; date: string; client: { name: string; phone: string } },
): Promise<{ id: string; hhmm: string; date: string }> {
  const first = Math.floor(Math.random() * 14);
  let lastError = "";
  // Dia bloqueado de propósito (ex.: a folga fixa do seed em 12/10/2026) ou fechado: tenta o dia seguinte.
  for (let dayShift = 0; dayShift < 5; dayShift++) {
    const date = addDaysToIsoDate(params.date, dayShift);
    for (let attempt = 0; attempt < 14; attempt++) {
      const minute = 20 * 60 + 15 * ((first + attempt) % 14);
      const hhmm = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
      const response = await api.post("/api/admin/appointments", {
        data: { ...params, date: undefined, startAt: `${date}T${hhmm}:00-03:00`, allowOutsideHours: true },
      });
      if (response.status() === 201) return { id: (await response.json()).appointment.id as string, hhmm, date };
      lastError = await response.text();
      if (response.status() !== 400) throw new Error(`Encaixe falhou: ${response.status()} ${lastError}`);
      if (/bloqueado|fechado/i.test(lastError)) break;
    }
  }
  throw new Error(`Nenhum horário livre à noite para o teste (último erro: ${lastError})`);
}

function addDaysToIsoDate(dateISO: string, days: number): string {
  const [year, month, day] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}
