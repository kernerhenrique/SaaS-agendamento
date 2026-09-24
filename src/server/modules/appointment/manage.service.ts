import { AppointmentStatus } from "@/generated/prisma/enums";
import { prisma } from "@/server/db/prisma";
import { NotFoundError, ValidationError } from "@/server/errors";

import { isOverlapConstraintViolation, MANAGE_TOKEN_TTL_DAYS_AFTER_APPOINTMENT } from "./appointment.service";

/**
 * Mensagem sempre genérica: nunca revela se o token é inválido, já expirou,
 * ou simplesmente não existe. Buscar sempre só pelo token — nunca combinar
 * com nome/telefone/e-mail.
 */
const GENERIC_TOKEN_ERROR = "Link inválido ou expirado";

const RESCHEDULABLE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
];

function isTokenExpired(expiresAt: Date | null): boolean {
  return expiresAt != null && expiresAt.getTime() < Date.now();
}

export async function getAppointmentForManagement(token: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { manageToken: token },
    include: { business: true, professional: true, service: true, client: true, review: true },
  });

  if (!appointment || isTokenExpired(appointment.manageTokenExpiresAt)) {
    throw new NotFoundError(GENERIC_TOKEN_ERROR);
  }

  return appointment;
}

export async function cancelAppointmentByToken(token: string) {
  const appointment = await getAppointmentForManagement(token);

  if (!RESCHEDULABLE_STATUSES.includes(appointment.status)) {
    throw new ValidationError("Este agendamento não pode mais ser cancelado");
  }
  if (appointment.startAt.getTime() <= Date.now()) {
    throw new ValidationError("Não é possível cancelar um agendamento que já passou");
  }

  return prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: AppointmentStatus.CANCELLED },
  });
}

export async function rescheduleAppointmentByToken(token: string, newStartAt: Date) {
  const appointment = await getAppointmentForManagement(token);

  if (!RESCHEDULABLE_STATUSES.includes(appointment.status)) {
    throw new ValidationError("Este agendamento não pode mais ser reagendado");
  }
  if (appointment.startAt.getTime() <= Date.now()) {
    throw new ValidationError("Não é possível reagendar um agendamento que já passou");
  }
  if (newStartAt.getTime() <= Date.now()) {
    throw new ValidationError("Escolha um horário no futuro");
  }

  const newEndAt = new Date(newStartAt.getTime() + appointment.service.durationMin * 60_000);
  const newManageTokenExpiresAt = new Date(
    newEndAt.getTime() + MANAGE_TOKEN_TTL_DAYS_AFTER_APPOINTMENT * 24 * 60 * 60 * 1000,
  );

  try {
    return await prisma.appointment.update({
      where: { id: appointment.id },
      data: { startAt: newStartAt, endAt: newEndAt, manageTokenExpiresAt: newManageTokenExpiresAt },
    });
  } catch (error) {
    if (isOverlapConstraintViolation(error)) {
      throw new ValidationError("Esse horário acabou de deixar de estar disponível");
    }
    throw error;
  }
}

export async function addReviewByToken(token: string, rating: number, comment?: string) {
  const appointment = await getAppointmentForManagement(token);

  if (appointment.status !== AppointmentStatus.COMPLETED) {
    throw new ValidationError("Só é possível avaliar depois que o atendimento for concluído");
  }
  if (appointment.review) {
    throw new ValidationError("Este agendamento já foi avaliado");
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ValidationError("A nota deve ser um número inteiro de 1 a 5");
  }

  return prisma.review.create({
    data: { appointmentId: appointment.id, rating, comment: comment ?? null },
  });
}
