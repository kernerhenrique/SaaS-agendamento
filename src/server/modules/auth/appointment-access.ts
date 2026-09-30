import { prisma } from "@/server/db/prisma";
import { ForbiddenError, NotFoundError } from "@/server/errors";

import type { RegisterPaymentInput } from "@/server/modules/payment/payment.service";

import { can, canActOnAppointment, type Access } from "./permissions";

/**
 * Carrega o agendamento do negócio da sessão e confere se quem está logado
 * pode agir nele. Agendamento de colega responde "não encontrado" (como um id
 * inexistente): o profissional não fica sabendo que ele existe.
 */
export async function requireAppointmentAccess(access: Access, appointmentId: string) {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, businessId: access.businessId },
    select: { id: true, professionalId: true, priceCents: true },
  });
  if (!appointment || !canActOnAppointment(access, appointment)) {
    throw new NotFoundError("Agendamento não encontrado");
  }
  return appointment;
}

/**
 * Profissional registra o que o cliente pagou, mas sem desconto e sem mudar
 * o valor do atendimento (decisão do dono). O valor igual ao atual é aceito,
 * porque o formulário pode reenviá-lo.
 */
export function assertPaymentAllowed(access: Access, input: RegisterPaymentInput, currentPriceCents: number): void {
  if (can(access.role, "payment.discount")) return;
  const changesPrice = input.priceCents !== undefined && input.priceCents !== currentPriceCents;
  if (input.discountCents > 0 || changesPrice) {
    throw new ForbiddenError("Desconto e mudança de valor ficam com o dono do negócio");
  }
}

/** Cadastro de profissional: o dono vê todos; o profissional só o próprio (colega = "não encontrado"). */
export function requireProfessionalAccess(access: Access, professionalId: string): void {
  if (can(access.role, "appointment.manageAny")) return;
  if (professionalId !== access.professionalId) throw new NotFoundError("Cadastro não encontrado");
}

/** Profissional só marca/remarca na própria agenda: o cadastro vem da sessão, nunca do corpo. */
export function assertOwnProfessional(access: Access, professionalId: string): void {
  if (can(access.role, "appointment.manageAny")) return;
  if (professionalId !== access.professionalId) {
    throw new ForbiddenError("Você só pode marcar na sua própria agenda");
  }
}
