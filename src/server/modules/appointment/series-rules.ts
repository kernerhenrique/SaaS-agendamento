import type { Weekday } from "@/generated/prisma/enums";
import { addDaysToIsoDate, localMinutesToUtc, rangesOverlap, utcToLocalDate, utcToLocalMinutes, weekdayOfLocalDate } from "@/lib/date";
import { ValidationError } from "@/server/errors";
import { findClosure, type ClosureRange } from "@/server/modules/business/closure-rules";

import { isInPast, workingHoursProblem, type WorkingHoursWindow } from "./admin-booking-rules";

/**
 * Agendamento recorrente ("toda terça às 10h"). Regras puras, testadas: as
 * datas da série e por que uma data não dá. Quem grava é `series.service.ts`.
 */

export const SERIES_FREQUENCIES = [1, 2, 4] as const;
export type SeriesFrequency = (typeof SERIES_FREQUENCIES)[number];
/** Datas criadas de uma vez (contando a primeira); "Renovar" acrescenta mais. */
export const SERIES_MAX_OCCURRENCES = 12;

export function describeFrequency(weeks: number): string {
  return weeks === 1 ? "toda semana" : `a cada ${weeks} semanas`;
}

export function parseSeriesOptions(body: Record<string, unknown>): { frequencyWeeks: SeriesFrequency; count: number } {
  const frequencyWeeks = body.frequencyWeeks;
  const count = body.count;
  if (!SERIES_FREQUENCIES.includes(frequencyWeeks as SeriesFrequency)) {
    throw new ValidationError("Frequência inválida: toda semana, a cada 2 ou a cada 4 semanas");
  }
  if (typeof count !== "number" || !Number.isInteger(count) || count < 2 || count > SERIES_MAX_OCCURRENCES) {
    throw new ValidationError(`Repetições: de 2 a ${SERIES_MAX_OCCURRENCES} datas`);
  }
  return { frequencyWeeks: frequencyWeeks as SeriesFrequency, count };
}

/** `count` datas a partir de `firstDate` (inclusive), de `frequencyWeeks` em `frequencyWeeks` semanas. */
export function buildSeriesDates(firstDate: string, frequencyWeeks: number, count: number): string[] {
  return Array.from({ length: count }, (_, index) => addDaysToIsoDate(firstDate, index * 7 * frequencyWeeks));
}

export interface OccurrenceContext {
  now: Date;
  timeZone: string;
  weeklyHours: (WorkingHoursWindow & { weekday: Weekday })[];
  closures: ClosureRange[];
  blocks: { startAt: Date; endAt: Date }[];
  /** Agendamentos ativos (não cancelados) do profissional. */
  busy: { startAt: Date; endAt: Date }[];
}

/** Por que a data não dá, ou null se está livre. Mesma ordem de prioridade das telas. */
export function occurrenceProblem(startAt: Date, endAt: Date, context: OccurrenceContext): string | null {
  if (isInPast(startAt, context.now)) return "Já passou";
  const date = utcToLocalDate(startAt, context.timeZone);
  const closure = findClosure(date, context.closures);
  if (closure) return `Fechado: ${closure.reason}`;
  const weekday = weekdayOfLocalDate(date);
  const startMinute = utcToLocalMinutes(startAt, context.timeZone);
  const durationMin = Math.round((endAt.getTime() - startAt.getTime()) / 60_000);
  const hours = context.weeklyHours.find((wh) => wh.weekday === weekday) ?? null;
  if (workingHoursProblem(hours, startMinute, startMinute + durationMin)) return "Fora do expediente";
  if (context.blocks.some((block) => rangesOverlap(startAt, endAt, block.startAt, block.endAt))) return "Bloqueio na agenda";
  if (context.busy.some((appointment) => rangesOverlap(startAt, endAt, appointment.startAt, appointment.endAt))) return "Horário ocupado";
  return null;
}

export interface PlannedOccurrence {
  date: string;
  startAt: Date;
  endAt: Date;
  problem: string | null;
}

/** Cada data da série com o início/fim no fuso do negócio e o problema (se houver). */
export function planOccurrences(params: {
  dates: string[];
  startMinute: number;
  durationMin: number;
  context: OccurrenceContext;
}): PlannedOccurrence[] {
  return params.dates.map((date) => {
    const startAt = localMinutesToUtc(date, params.startMinute, params.context.timeZone);
    const endAt = localMinutesToUtc(date, params.startMinute + params.durationMin, params.context.timeZone);
    return { date, startAt, endAt, problem: occurrenceProblem(startAt, endAt, params.context) };
  });
}
