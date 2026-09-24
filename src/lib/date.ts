import { fromZonedTime } from "date-fns-tz";

import { Weekday } from "@/generated/prisma/enums";

const WEEKDAYS_BY_JS_INDEX: Weekday[] = [
  Weekday.SUNDAY,
  Weekday.MONDAY,
  Weekday.TUESDAY,
  Weekday.WEDNESDAY,
  Weekday.THURSDAY,
  Weekday.FRIDAY,
  Weekday.SATURDAY,
];

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDateOnly(dateISO: string): { year: number; month: number; day: number } {
  if (!DAY_PATTERN.test(dateISO)) {
    throw new Error(`Data inválida, esperado formato YYYY-MM-DD: ${dateISO}`);
  }
  const [year, month, day] = dateISO.split("-").map(Number);
  return { year, month, day };
}

/**
 * Converte uma data (YYYY-MM-DD) + minutos desde 00:00, interpretados como
 * horário local de `timeZone`, para o instante UTC correspondente. Respeita
 * horário de verão/mudanças de offset porque a conversão é feita para a data
 * específica, não com um offset fixo.
 *
 * `fromZonedTime` só interpreta corretamente uma string "ingênua" (sem `Z`/
 * offset) como horário de parede na zona informada — passar um `Date` é
 * tratado como instante absoluto e não sofre nenhuma conversão.
 */
export function localMinutesToUtc(dateISO: string, minutes: number, timeZone: string): Date {
  const { year, month, day } = parseDateOnly(dateISO);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const naiveWallClock = `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(mins)}:00`;
  return fromZonedTime(naiveWallClock, timeZone);
}

/** Início (00:00) e fim (00:00 do dia seguinte) de uma data local, como instantes UTC. */
export function localDayRangeUtc(dateISO: string, timeZone: string): { start: Date; end: Date } {
  const { year, month, day } = parseDateOnly(dateISO);
  // Date.UTC normaliza "dia 32" etc. para o mês seguinte; usamos isso só para
  // achar a data (ano/mês/dia) seguinte, não como instante real.
  const nextDayUtc = new Date(Date.UTC(year, month - 1, day + 1));
  const nextDayISO = nextDayUtc.toISOString().slice(0, 10);

  return {
    start: localMinutesToUtc(dateISO, 0, timeZone),
    end: localMinutesToUtc(nextDayISO, 0, timeZone),
  };
}

/**
 * Dia da semana (enum Weekday) de uma data de calendário YYYY-MM-DD. O dia da
 * semana de uma data de calendário não depende de timezone — "24/09/2026" é
 * quinta-feira em qualquer lugar — então basta calculá-lo em UTC puro.
 */
export function weekdayOfLocalDate(dateISO: string): Weekday {
  const { year, month, day } = parseDateOnly(dateISO);
  return WEEKDAYS_BY_JS_INDEX[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

/**
 * Minutos desde 00:00 local (no timezone informado) que um instante UTC
 * representa. Usa Intl em vez de `toZonedTime` + getters de `Date`: o
 * resultado daquele depende do timezone do processo (servidor ou navegador),
 * o que já causou horários deslocados na agenda.
 */
export function utcToLocalMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  return hour * 60 + minute;
}

/** Data de calendário (YYYY-MM-DD) que um instante UTC representa no timezone informado. */
export function utcToLocalDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Data (YYYY-MM-DD) de "hoje" observada no timezone informado. */
export function todayInTimeZone(timeZone: string): string {
  return utcToLocalDate(new Date(), timeZone);
}

/** Soma (ou subtrai, com `days` negativo) dias a uma data YYYY-MM-DD, sem depender de timezone. */
export function addDaysToIsoDate(dateISO: string, days: number): string {
  const { year, month, day } = parseDateOnly(dateISO);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Rótulo por extenso ("quinta-feira, 24 de setembro") de uma data YYYY-MM-DD no timezone informado. */
export function formatDateLabel(dateISO: string, timeZone: string): string {
  const { year, month, day } = parseDateOnly(dateISO);
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(noonUtc);
}

export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}
