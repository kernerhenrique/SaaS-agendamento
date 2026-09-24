export interface DayRange {
  rangeStartMinute: number;
  rangeEndMinute: number;
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
export function computeDayRange(
  workingHourRanges: { startMinute: number; endMinute: number }[],
  itemRanges: { startMinute: number; endMinute: number }[],
): DayRange {
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
