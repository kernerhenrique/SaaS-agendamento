import { addDaysToIsoDate } from "@/lib/date";
import { ValidationError } from "@/server/errors";

/**
 * Dias fechados do negócio (feriados, férias coletivas). Datas de calendário
 * "YYYY-MM-DD" no fuso do negócio, fim inclusivo; comparação de texto basta
 * (o formato ordena como data). Funções puras, testadas.
 */
export interface ClosureRange {
  startDate: string;
  endDate: string;
  reason: string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_CLOSURE_DAYS = 366;
export const CLOSURE_REASON_MAX = 60;

/** O fechamento que cobre a data, se houver (o primeiro, quando se sobrepõem). */
export function findClosure<T extends ClosureRange>(dateISO: string, closures: T[]): T | null {
  return closures.find((closure) => closure.startDate <= dateISO && dateISO <= closure.endDate) ?? null;
}

function isRealDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function daysBetween(startDate: string, endDate: string): number {
  return Math.round((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86_400_000);
}

/** `{ startDate, endDate?, reason }` do formulário. Sem fim = um dia só. */
export function parseClosureInput(body: unknown): ClosureRange {
  const record = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const startDate = typeof record.startDate === "string" ? record.startDate : "";
  const endDate = typeof record.endDate === "string" && record.endDate !== "" ? record.endDate : startDate;
  const reason = typeof record.reason === "string" ? record.reason.trim() : "";
  if (!isRealDate(startDate)) throw new ValidationError("Informe a data (dd/mm/aaaa)");
  if (!isRealDate(endDate)) throw new ValidationError("Data final inválida");
  if (endDate < startDate) throw new ValidationError("A data final precisa ser igual ou depois da inicial");
  if (daysBetween(startDate, endDate) >= MAX_CLOSURE_DAYS) throw new ValidationError("Período longo demais: no máximo 1 ano");
  if (!reason) throw new ValidationError("Informe o motivo (aparece para o cliente, ex.: Natal, Férias coletivas)");
  if (reason.length > CLOSURE_REASON_MAX) throw new ValidationError(`O motivo pode ter no máximo ${CLOSURE_REASON_MAX} caracteres`);
  return { startDate, endDate, reason };
}

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher, calendário gregoriano). */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export interface Holiday {
  date: string;
  name: string;
  /** Ponto facultativo (Carnaval, Corpus Christi): o negócio decide se fecha. */
  optional: boolean;
}

/** Feriados nacionais do Brasil (lei federal) e os pontos facultativos mais comuns. */
export function brazilianHolidays(year: number): Holiday[] {
  const easter = easterSunday(year);
  const fixed = (monthDay: string, name: string): Holiday => ({ date: `${year}-${monthDay}`, name, optional: false });
  return [
    fixed("01-01", "Confraternização Universal"),
    { date: addDaysToIsoDate(easter, -48), name: "Carnaval (segunda)", optional: true },
    { date: addDaysToIsoDate(easter, -47), name: "Carnaval (terça)", optional: true },
    { date: addDaysToIsoDate(easter, -2), name: "Sexta-feira Santa", optional: false },
    fixed("04-21", "Tiradentes"),
    fixed("05-01", "Dia do Trabalho"),
    { date: addDaysToIsoDate(easter, 60), name: "Corpus Christi", optional: true },
    fixed("09-07", "Independência do Brasil"),
    fixed("10-12", "Nossa Senhora Aparecida"),
    fixed("11-02", "Finados"),
    fixed("11-15", "Proclamação da República"),
    fixed("11-20", "Dia da Consciência Negra"),
    fixed("12-25", "Natal"),
  ].sort((x, y) => x.date.localeCompare(y.date));
}

/** Feriados dos próximos 12 meses a partir de hoje (para o botão "Adicionar feriados nacionais"). */
export function upcomingHolidays(todayISO: string): Holiday[] {
  const year = Number(todayISO.slice(0, 4));
  const limit = addDaysToIsoDate(todayISO, 365);
  return [...brazilianHolidays(year), ...brazilianHolidays(year + 1)].filter((h) => h.date >= todayISO && h.date <= limit);
}
