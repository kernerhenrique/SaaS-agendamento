import type { Weekday } from "@/generated/prisma/enums";
import { WEEKDAY_LABELS, minutesToTimeInput } from "@/lib/weekday";

/**
 * O expediente de cada profissional cabe no horário de funcionamento do
 * negócio (módulo puro: servidor e tela). Sem isso a página dizia "Aberto
 * hoje · 09:00 às 17:00" e oferecia horário às 18:30. A disponibilidade
 * continua vindo só do expediente; aqui é a validação de quem configura.
 * Negócio sem nenhum horário cadastrado: não há o que comparar.
 */
export interface DayHours {
  weekday: Weekday;
  startMinute: number;
  endMinute: number;
}

export interface HoursConflict {
  weekday: Weekday;
  /** Horário do negócio no dia (null = fechado). */
  business: { startMinute: number; endMinute: number } | null;
  professional: { startMinute: number; endMinute: number };
}

export function findHoursConflicts(businessHours: DayHours[], professionalHours: DayHours[]): HoursConflict[] {
  if (businessHours.length === 0) return [];
  const conflicts: HoursConflict[] = [];
  for (const day of professionalHours) {
    const open = businessHours.find((entry) => entry.weekday === day.weekday) ?? null;
    if (!open || day.startMinute < open.startMinute || day.endMinute > open.endMinute) {
      conflicts.push({
        weekday: day.weekday,
        business: open ? { startMinute: open.startMinute, endMinute: open.endMinute } : null,
        professional: { startMinute: day.startMinute, endMinute: day.endMinute },
      });
    }
  }
  return conflicts;
}

const range = (start: number, end: number) => `${minutesToTimeInput(start)} às ${minutesToTimeInput(end)}`;

/** "Sábado: o negócio abre das 09:00 às 17:00 (expediente: 10:00 às 19:00)". */
export function describeHoursConflict(conflict: HoursConflict): string {
  const day = WEEKDAY_LABELS[conflict.weekday];
  const own = range(conflict.professional.startMinute, conflict.professional.endMinute);
  return conflict.business
    ? `${day}: o negócio abre das ${range(conflict.business.startMinute, conflict.business.endMinute)} (expediente: ${own})`
    : `${day}: o negócio está fechado (expediente: ${own})`;
}
