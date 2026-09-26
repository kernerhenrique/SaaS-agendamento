import type { Weekday } from "@/generated/prisma/enums";
import { localMinutesToUtc, utcToLocalDate, utcToLocalMinutes, weekdayOfLocalDate } from "@/lib/date";

/**
 * Regras de horário para agendamentos criados ou remarcados pelo painel
 * (encaixe manual, arrastar na agenda, "Remarcar" no drawer). Módulo puro:
 * roda no servidor (fonte da verdade) e na tela (aviso antes de enviar).
 * A página pública não passa por aqui — lá quem manda é a disponibilidade.
 */

/** Aceita início até 15 min atrás: registrar um encaixe que acabou de começar. */
export const PAST_TOLERANCE_MINUTES = 15;

/** `code` do erro 400 quando dá para seguir com "Agendar mesmo assim". */
export const OUTSIDE_WORKING_HOURS = "OUTSIDE_WORKING_HOURS";

export const PAST_MESSAGE = "Não é possível agendar em um horário que já passou";

export interface WorkingHoursWindow {
  startMinute: number;
  endMinute: number;
  breakStartMinute: number | null;
  breakEndMinute: number | null;
}

export function isInPast(startAt: Date, now: Date): boolean {
  return startAt.getTime() < now.getTime() - PAST_TOLERANCE_MINUTES * 60_000;
}

/** O intervalo inteiro [início, fim) cabe no expediente e não pega o intervalo (almoço). */
export function isWithinWorkingHours(
  workingHours: WorkingHoursWindow | null,
  startMinute: number,
  endMinute: number,
): boolean {
  if (!workingHours) return false;
  if (startMinute < workingHours.startMinute || endMinute > workingHours.endMinute) return false;
  const { breakStartMinute, breakEndMinute } = workingHours;
  if (breakStartMinute != null && breakEndMinute != null) {
    return endMinute <= breakStartMinute || startMinute >= breakEndMinute;
  }
  return true;
}

/** Mensagem de "fora do expediente", ou null quando o horário está dentro. */
export function workingHoursProblem(
  workingHours: WorkingHoursWindow | null,
  startMinute: number,
  endMinute: number,
): string | null {
  if (!workingHours) return "Sem expediente neste dia";
  if (!isWithinWorkingHours(workingHours, startMinute, endMinute)) return "Fora do expediente deste cadastro";
  return null;
}

/**
 * Versão para a tela, que já tem data e hora locais em mãos: diz se o horário
 * está no passado e qual expediente vale no dia (para o aviso do formulário).
 */
export function evaluateLocalSlot(slot: {
  date: string;
  startMinute: number;
  durationMin: number;
  timeZone: string;
  now: Date;
  weeklyHours: (WorkingHoursWindow & { weekday: Weekday })[];
}): { isPast: boolean; workingHours: WorkingHoursWindow | null; isOutsideHours: boolean } {
  const weekday = weekdayOfLocalDate(slot.date);
  const workingHours = slot.weeklyHours.find((wh) => wh.weekday === weekday) ?? null;
  return {
    isPast: isInPast(localMinutesToUtc(slot.date, slot.startMinute, slot.timeZone), slot.now),
    workingHours,
    isOutsideHours: !isWithinWorkingHours(workingHours, slot.startMinute, slot.startMinute + slot.durationMin),
  };
}

export interface AdminBookingCheck {
  startAt: Date;
  durationMin: number;
  now: Date;
  timeZone: string;
  weeklyHours: (WorkingHoursWindow & { weekday: Weekday })[];
  allowOutsideHours: boolean;
}

/**
 * Passado e expediente, no fuso do negócio. Devolve o erro (com `code` quando
 * a tela pode oferecer "mesmo assim") ou null.
 */
export function checkAdminBookingTime(check: AdminBookingCheck): { message: string; code?: string } | null {
  if (isInPast(check.startAt, check.now)) return { message: PAST_MESSAGE };
  if (check.allowOutsideHours) return null;

  const weekday = weekdayOfLocalDate(utcToLocalDate(check.startAt, check.timeZone));
  const startMinute = utcToLocalMinutes(check.startAt, check.timeZone);
  const workingHours = check.weeklyHours.find((wh) => wh.weekday === weekday) ?? null;
  const problem = workingHoursProblem(workingHours, startMinute, startMinute + check.durationMin);
  return problem ? { message: problem, code: OUTSIDE_WORKING_HOURS } : null;
}
