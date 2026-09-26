import type { AppointmentStatus, Weekday } from "@/generated/prisma/enums";
import { addDaysToIsoDate, localMinutesToUtc, weekdayOfLocalDate } from "@/lib/date";

export interface WorkingHoursLike {
  weekday: Weekday;
  startMinute: number;
  endMinute: number;
  breakStartMinute: number | null;
  breakEndMinute: number | null;
}

export interface Interval {
  startAt: Date;
  endAt: Date;
}

/** Datas YYYY-MM-DD de `start` a `end`, inclusive. */
export function datesInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  for (let date = startDate; date <= endDate; date = addDaysToIsoDate(date, 1)) dates.push(date);
  return dates;
}

/** Primeiro e último dia (YYYY-MM-DD) do mês de uma data. */
export function monthRange(dateISO: string): { startDate: string; endDate: string } {
  const startDate = `${dateISO.slice(0, 7)}-01`;
  const [year, month] = dateISO.split("-").map(Number);
  const nextMonthFirst = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  return { startDate, endDate: addDaysToIsoDate(nextMonthFirst, -1) };
}

function overlapMs(a: Interval, b: Interval): number {
  return Math.max(0, Math.min(a.endAt.getTime(), b.endAt.getTime()) - Math.max(a.startAt.getTime(), b.startAt.getTime()));
}

/**
 * Janelas de atendimento (em UTC) de um profissional nas datas dadas, já sem o
 * intervalo de almoço.
 */
export function workingWindows(workingHours: WorkingHoursLike[], dates: string[], timeZone: string): Interval[] {
  const byWeekday = new Map(workingHours.map((wh) => [wh.weekday, wh]));
  const windows: Interval[] = [];
  for (const date of dates) {
    const wh = byWeekday.get(weekdayOfLocalDate(date));
    if (!wh) continue;
    const at = (minute: number) => localMinutesToUtc(date, minute, timeZone);
    if (wh.breakStartMinute != null && wh.breakEndMinute != null) {
      windows.push({ startAt: at(wh.startMinute), endAt: at(wh.breakStartMinute) });
      windows.push({ startAt: at(wh.breakEndMinute), endAt: at(wh.endMinute) });
    } else {
      windows.push({ startAt: at(wh.startMinute), endAt: at(wh.endMinute) });
    }
  }
  return windows;
}

/** Minutos de expediente disponíveis: janelas menos o que cai em bloqueios (folga, férias). */
export function availableMinutes(windows: Interval[], blocks: Interval[]): number {
  let totalMs = 0;
  for (const window of windows) {
    const blockedMs = blocks.reduce((sum, block) => sum + overlapMs(window, block), 0);
    totalMs += Math.max(0, window.endAt.getTime() - window.startAt.getTime() - blockedMs);
  }
  return Math.round(totalMs / 60_000);
}

/** Ocupação (0..1) ou null quando não há expediente no período. */
export function computeOccupancyRate(bookedMinutes: number, available: number): number | null {
  if (available <= 0) return null;
  return Math.min(1, bookedMinutes / available);
}

/**
 * Taxa de faltas entre os atendimentos que já deveriam ter acontecido
 * (não cancelados, início antes de `now`). null sem base de cálculo.
 */
export function computeNoShowRate(
  appointments: { status: AppointmentStatus; startAt: Date }[],
  now: Date,
): number | null {
  const past = appointments.filter((a) => a.status !== "CANCELLED" && a.startAt < now);
  if (past.length === 0) return null;
  return past.filter((a) => a.status === "NO_SHOW").length / past.length;
}

/** Agendamento ainda aberto (pendente/confirmado) cujo horário já começou. */
export function isLate(appointment: { status: AppointmentStatus; startAt: Date }, now: Date): boolean {
  return (appointment.status === "PENDING" || appointment.status === "CONFIRMED") && appointment.startAt < now;
}
