import { fromZonedTime, toZonedTime } from "date-fns-tz";

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
 * Dia da semana (enum Weekday) que uma data YYYY-MM-DD representa no timezone
 * informado. `toZonedTime` devolve um `Date` cujos getters UTC (não os locais,
 * que dependem do timezone do processo Node) refletem o horário de parede na
 * zona informada — por isso usamos `getUTCDay()` aqui.
 */
export function weekdayOfLocalDate(dateISO: string, timeZone: string): Weekday {
  const { start } = localDayRangeUtc(dateISO, timeZone);
  const zoned = toZonedTime(start, timeZone);
  return WEEKDAYS_BY_JS_INDEX[zoned.getUTCDay()];
}

/** Minutos desde 00:00 local (no timezone informado) que um instante UTC representa num dado dia. */
export function utcToLocalMinutes(date: Date, timeZone: string): number {
  const zoned = toZonedTime(date, timeZone);
  return zoned.getUTCHours() * 60 + zoned.getUTCMinutes();
}

export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}
