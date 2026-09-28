import { addDaysToIsoDate, utcToLocalDate } from "@/lib/date";

/**
 * Políticas de reserva do negócio (Configurações → Reservas). Valem para quem
 * agenda sem login — página pública e link de gerenciar. O encaixe feito pelo
 * painel segue `admin-booking-rules.ts` e não passa por aqui.
 */
export interface BookingPolicy {
  minBookingNoticeMinutes: number;
  maxBookingWindowDays: number;
  cancellationDeadlineHours: number;
}

export const DEFAULT_BOOKING_POLICY: BookingPolicy = {
  minBookingNoticeMinutes: 0,
  maxBookingWindowDays: 60,
  cancellationDeadlineHours: 0,
};

/**
 * Limites da reserva a partir de agora: o primeiro instante que pode ser
 * reservado (agora + antecedência mínima) e a última data local aceita
 * (hoje + janela, inclusive — janela de 60 dias = até daqui a 60 dias).
 */
export function bookingWindow(params: {
  now: Date;
  timeZone: string;
  minNoticeMinutes: number;
  maxWindowDays: number;
}): { earliestStart: Date; lastDate: string } {
  const today = utcToLocalDate(params.now, params.timeZone);
  return {
    earliestStart: new Date(params.now.getTime() + params.minNoticeMinutes * 60_000),
    lastDate: addDaysToIsoDate(today, params.maxWindowDays),
  };
}

/**
 * O cliente ainda pode cancelar/remarcar pelo link? Só até `deadlineHours`
 * antes do início. Com prazo 0, vale até o horário marcado (regra anterior).
 */
export function canClientChange(startAt: Date, now: Date, deadlineHours: number): boolean {
  return now.getTime() < startAt.getTime() - deadlineHours * 60 * 60_000;
}

export function clientChangeDeadlineMessage(deadlineHours: number): string {
  const prazo = deadlineHours === 1 ? "1 hora" : `${deadlineHours} horas`;
  return `Alterações pelo link só até ${prazo} antes do horário. Fale com o estabelecimento.`;
}
