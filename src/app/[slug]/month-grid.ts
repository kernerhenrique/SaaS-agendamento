/** "2026-09" de uma data YYYY-MM-DD. */
export function yearMonthOf(dateISO: string): string {
  return dateISO.slice(0, 7);
}

/** Soma (ou subtrai) meses a um "YYYY-MM". */
export function shiftYearMonth(yearMonth: string, months: number): string {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + months, 1)).toISOString().slice(0, 7);
}

/**
 * Semanas (domingo a sábado) de um mês, com cada dia como YYYY-MM-DD e
 * `null` nas células antes do dia 1 e depois do último dia. Datas de
 * calendário puras, sem timezone envolvido.
 */
export function buildMonthGrid(yearMonth: string): (string | null)[][] {
  const [year, month] = yearMonth.split("-").map(Number);
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const cells: (string | null)[] = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(`${yearMonth}-${String(day).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
