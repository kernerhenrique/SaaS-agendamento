import type { AppointmentStatus } from "@/generated/prisma/enums";
import { rangesOverlap } from "@/lib/date";

/** Só agendamentos em aberto podem mudar de horário/profissional. */
export const RESCHEDULABLE_STATUSES: AppointmentStatus[] = ["PENDING", "CONFIRMED"];

export interface AdminRescheduleCheck {
  status: AppointmentStatus;
  professionalActive: boolean;
  professionalOffersService: boolean;
  newStartAt: Date;
  newEndAt: Date;
  blocks: { startAt: Date; endAt: Date }[];
}

/**
 * Regras da remarcação feita pelo admin (arrastar na agenda ou "Remarcar" no
 * drawer). Devolve a mensagem de erro ou null. Conflito com outro agendamento
 * NÃO é checado aqui: quem garante é a exclusion constraint do banco. Fora do
 * expediente é permitido de propósito (encaixe) — a tela pede confirmação.
 */
export function checkAdminReschedule(check: AdminRescheduleCheck): string | null {
  if (!RESCHEDULABLE_STATUSES.includes(check.status)) {
    return "Só agendamentos pendentes ou confirmados podem ser remarcados";
  }
  if (!check.professionalActive) return "Esse cadastro está inativo";
  if (!check.professionalOffersService) return "Esse cadastro não realiza este serviço";
  if (check.blocks.some((block) => rangesOverlap(check.newStartAt, check.newEndAt, block.startAt, block.endAt))) {
    return "Esse horário está bloqueado na agenda";
  }
  return null;
}
