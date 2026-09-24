import { utcToLocalMinutes } from "@/lib/date";

export interface DayRange {
  rangeStartMinute: number;
  rangeEndMinute: number;
}

export interface MinuteRange {
  startMinute: number;
  endMinute: number;
}

/**
 * Converte um intervalo de instantes (UTC) para minutos locais dentro do dia
 * visualizado, recortando o que passar das bordas do dia — um bloqueio de
 * dia inteiro (00:00 → 00:00 do dia seguinte) vira 0 → 1440, não 0 → 0.
 */
export function instantRangeToDayMinutes(
  startAt: Date,
  endAt: Date,
  day: { start: Date; end: Date },
  timeZone: string,
): MinuteRange {
  return {
    startMinute: startAt <= day.start ? 0 : utcToLocalMinutes(startAt, timeZone),
    endMinute: endAt >= day.end ? 24 * 60 : utcToLocalMinutes(endAt, timeZone),
  };
}

/** Recorta um intervalo aos limites visíveis da grade; `null` se ficar vazio. */
export function clampToRange(item: MinuteRange, range: DayRange): MinuteRange | null {
  const startMinute = Math.max(item.startMinute, range.rangeStartMinute);
  const endMinute = Math.min(item.endMinute, range.rangeEndMinute);
  return endMinute > startMinute ? { startMinute, endMinute } : null;
}

const DEFAULT_RANGE: DayRange = { rangeStartMinute: 8 * 60, rangeEndMinute: 20 * 60 };
const PADDING_MINUTES = 30;

/**
 * Calcula o intervalo [início, fim] em minutos do dia a exibir na grade, a
 * partir do expediente dos profissionais visíveis e de qualquer item
 * (agendamento/bloqueio) que caia fora do expediente — um encaixe manual
 * fora de horário, por exemplo. Arredonda para a hora cheia "para fora" e
 * aplica uma margem. Sem nenhum dado, cai no padrão 08:00–20:00.
 */
export function computeDayRange(workingHourRanges: MinuteRange[], itemRanges: MinuteRange[]): DayRange {
  const all = [...workingHourRanges, ...itemRanges];
  if (all.length === 0) return DEFAULT_RANGE;

  const rawStart = Math.min(...all.map((r) => r.startMinute));
  const rawEnd = Math.max(...all.map((r) => r.endMinute));

  return {
    rangeStartMinute: Math.floor(Math.max(0, rawStart - PADDING_MINUTES) / 60) * 60,
    rangeEndMinute: Math.ceil(Math.min(24 * 60, rawEnd + PADDING_MINUTES) / 60) * 60,
  };
}

export function minutesToTopPx(minute: number, range: DayRange, pixelsPerHour: number): number {
  return ((minute - range.rangeStartMinute) / 60) * pixelsPerHour;
}

export function minutesToHeightPx(
  startMinute: number,
  endMinute: number,
  pixelsPerHour: number,
  minHeightPx = 28,
): number {
  return Math.max(((endMinute - startMinute) / 60) * pixelsPerHour, minHeightPx);
}

export function hourMarks(range: DayRange): number[] {
  const marks: number[] = [];
  for (let m = range.rangeStartMinute; m <= range.rangeEndMinute; m += 60) marks.push(m);
  return marks;
}
