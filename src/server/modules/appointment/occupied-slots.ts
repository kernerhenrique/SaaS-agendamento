import { weekdayOfLocalDate } from "@/lib/date";
import { prisma } from "@/server/db/prisma";
import { findClosureForDate } from "@/server/modules/business/closure.service";

import { computeSlotsForProfessional, type GetAvailableSlotsParams, type Slot } from "./availability";
import { bookingWindow } from "./booking-policy";

/**
 * Horários OCUPADOS do dia, para a página pública mostrá-los desabilitados em
 * vez de escondê-los (design system: "disponibilidade honesta").
 *
 * Não altera a disponibilidade: os horários livres continuam vindo só de
 * `getAvailableSlots` (que também revalida a reserva). Aqui só se monta a
 * grade do expediente SEM a ocupação — mesmas regras de antecedência, janela,
 * intervalo e grade — e tudo o que está nela mas não está entre os livres é
 * "ocupado". Horário que já passou (ou antes da antecedência) não entra.
 */

/** Início (ISO) de cada horário da grade que não está livre, sem repetir, em ordem. */
export function occupiedStartTimes(candidates: Pick<Slot, "startAt">[], free: Pick<Slot, "startAt">[]): string[] {
  const freeTimes = new Set(free.map((slot) => slot.startAt.getTime()));
  const occupied = new Set<number>();
  for (const slot of candidates) {
    const time = slot.startAt.getTime();
    if (!freeTimes.has(time)) occupied.add(time);
  }
  return [...occupied].sort((a, b) => a - b).map((time) => new Date(time).toISOString());
}

/**
 * Grade do expediente sem ocupação, com os mesmos filtros de
 * `getAvailableSlots` (negócio, serviço ativo, profissionais aptos, políticas).
 * Sem `professionalId` ("sem preferência"), um horário só é ocupado se não
 * houver nenhum profissional livre nele.
 */
export async function getOccupiedSlotTimes(params: GetAvailableSlotsParams, free: Slot[]): Promise<string[]> {
  const { businessId, serviceId, professionalId, dateISO } = params;
  const [business, service] = await Promise.all([
    prisma.business.findFirst({ where: { id: businessId, deletedAt: null } }),
    prisma.service.findFirst({ where: { id: serviceId, businessId, active: true, deletedAt: null } }),
  ]);
  if (!business || !service) return [];

  const { earliestStart, lastDate } = bookingWindow({
    now: new Date(),
    timeZone: business.timezone,
    minNoticeMinutes: business.minBookingNoticeMinutes,
    maxWindowDays: business.maxBookingWindowDays,
  });
  if (dateISO > lastDate) return [];
  // Dia fechado: nada aparece riscado (a página mostra "Fechado" com o motivo).
  if (await findClosureForDate(businessId, dateISO)) return [];

  const professionals = await prisma.professional.findMany({
    where: {
      businessId,
      active: true,
      deletedAt: null,
      ...(professionalId ? { id: professionalId } : {}),
      professionalServices: { some: { serviceId } },
    },
    include: { workingHours: true },
  });

  const weekday = weekdayOfLocalDate(dateISO);
  const candidates = professionals.flatMap((professional) =>
    computeSlotsForProfessional({
      professionalId: professional.id,
      dateISO,
      timeZone: business.timezone,
      workingHours: professional.workingHours.find((entry) => entry.weekday === weekday) ?? null,
      busyIntervals: [],
      durationMin: service.durationMin,
      now: earliestStart,
    }),
  );
  return occupiedStartTimes(candidates, free);
}
