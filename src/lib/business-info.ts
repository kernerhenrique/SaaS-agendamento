import type { Weekday } from "@/generated/prisma/enums";

import { WEEKDAY_LABELS, WEEKDAY_ORDER, minutesToTimeInput } from "./weekday";

/**
 * Textos da página pública a partir das Configurações do negócio: horário de
 * funcionamento agrupado ("Seg a Sex") e políticas de reserva em frases.
 * Funções puras, usadas também na prévia da tela de Configurações.
 */

export interface BusinessHoursEntry {
  weekday: Weekday;
  startMinute: number;
  endMinute: number;
}

const SHORT_LABELS: Record<Weekday, string> = {
  MONDAY: "Seg",
  TUESDAY: "Ter",
  WEDNESDAY: "Qua",
  THURSDAY: "Qui",
  FRIDAY: "Sex",
  SATURDAY: "Sáb",
  SUNDAY: "Dom",
};

export const formatHoursRange = (entry: { startMinute: number; endMinute: number }) =>
  `${minutesToTimeInput(entry.startMinute)} às ${minutesToTimeInput(entry.endMinute)}`;

/** Agrupa dias seguidos (seg → dom) com o mesmo horário: "Seg a Sex · 09:00 às 18:00". Dias ausentes = fechado. */
export function groupBusinessHours(hours: BusinessHoursEntry[]): { days: string; hours: string }[] {
  const byDay = new Map(hours.map((entry) => [entry.weekday, entry]));
  const groups: { first: Weekday; last: Weekday; hours: string }[] = [];
  for (const weekday of WEEKDAY_ORDER) {
    const entry = byDay.get(weekday);
    const label = entry ? formatHoursRange(entry) : "Fechado";
    const previous = groups.at(-1);
    if (previous && previous.hours === label) previous.last = weekday;
    else groups.push({ first: weekday, last: weekday, hours: label });
  }
  return groups.map((group) => {
    const span = WEEKDAY_ORDER.indexOf(group.last) - WEEKDAY_ORDER.indexOf(group.first);
    const days =
      span === 0
        ? WEEKDAY_LABELS[group.first]
        : `${SHORT_LABELS[group.first]} ${span === 1 ? "e" : "a"} ${SHORT_LABELS[group.last]}`;
    return { days, hours: group.hours };
  });
}

/** "30 min", "2 h", "1 h 30 min", "1 dia", "3 dias" (dias só quando a conta fecha). */
export function formatMinutesDuration(minutes: number): string {
  if (minutes >= 24 * 60 && minutes % (24 * 60) === 0) {
    const days = minutes / (24 * 60);
    return days === 1 ? "1 dia" : `${days} dias`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export interface BookingPolicyValues {
  minBookingNoticeMinutes: number;
  maxBookingWindowDays: number;
  cancellationDeadlineHours: number;
}

/** Frases curtas para o cliente final, na ordem em que importam para ele. */
export function describeBookingPolicies(policy: BookingPolicyValues): string[] {
  const sentences: string[] = [];
  if (policy.minBookingNoticeMinutes > 0) {
    sentences.push(`Reservas com pelo menos ${formatMinutesDuration(policy.minBookingNoticeMinutes)} de antecedência`);
  }
  sentences.push(
    policy.maxBookingWindowDays === 1
      ? "Agenda aberta para hoje e amanhã"
      : `Agenda aberta para os próximos ${policy.maxBookingWindowDays} dias`,
  );
  sentences.push(
    policy.cancellationDeadlineHours > 0
      ? `Cancelamento ou troca pelo link até ${formatMinutesDuration(policy.cancellationDeadlineHours * 60)} antes do horário`
      : "Cancelamento ou troca pelo link até o horário marcado",
  );
  return sentences;
}
