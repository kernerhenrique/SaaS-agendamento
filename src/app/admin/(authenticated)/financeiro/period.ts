import { addDaysToIsoDate } from "@/lib/date";
import { monthRange } from "@/server/modules/dashboard/metrics";

/**
 * Períodos do Financeiro. Datas locais do negócio (YYYY-MM-DD), inclusivas;
 * o servidor converte para UTC pelo fuso do negócio.
 */
export const PERIOD_PRESETS = ["hoje", "7-dias", "mes", "mes-passado", "personalizado"] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  hoje: "Hoje",
  "7-dias": "Últimos 7 dias",
  mes: "Este mês",
  "mes-passado": "Mês passado",
  personalizado: "Personalizado",
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parsePeriodPreset(value: string | null | undefined): PeriodPreset {
  return PERIOD_PRESETS.includes(value as PeriodPreset) ? (value as PeriodPreset) : "mes";
}

/**
 * Intervalo de um período. "Personalizado" usa `custom` quando válido
 * (início ≤ fim); senão cai no mês atual.
 */
export function resolvePeriod(
  preset: PeriodPreset,
  today: string,
  custom?: { startDate?: string | null; endDate?: string | null },
): { startDate: string; endDate: string } {
  switch (preset) {
    case "hoje":
      return { startDate: today, endDate: today };
    case "7-dias":
      return { startDate: addDaysToIsoDate(today, -6), endDate: today };
    case "mes-passado":
      return monthRange(addDaysToIsoDate(`${today.slice(0, 7)}-01`, -1));
    case "personalizado": {
      const start = custom?.startDate;
      const end = custom?.endDate;
      if (start && end && DATE.test(start) && DATE.test(end) && start <= end) return { startDate: start, endDate: end };
      return monthRange(today);
    }
    default:
      return monthRange(today);
  }
}
