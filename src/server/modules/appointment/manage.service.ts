import { AppointmentStatus } from "@/generated/prisma/enums";
import { prisma } from "@/server/db/prisma";
import { NotFoundError, ValidationError } from "@/server/errors";

import { isOverlapConstraintViolation, MANAGE_TOKEN_TTL_DAYS_AFTER_APPOINTMENT } from "./appointment.service";
import { assertSlotAvailable } from "./availability";
import { canClientChange, clientChangeDeadlineMessage } from "./booking-policy";

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
    include: { business: true, professional: true, service: true, client: true },
  });

  if (!appointment || isTokenExpired(appointment.manageTokenExpiresAt)) {
    throw new NotFoundError(GENERIC_TOKEN_ERROR);
  }

  return appointment;
}

type ManagedAppointment = Awaited<ReturnType<typeof getAppointmentForManagement>>;

/** Dentro do prazo de cancelamento do negócio o cliente precisa falar com o estabelecimento. */
export function clientCanChange(appointment: ManagedAppointment, now = new Date()): boolean {
  return (
    RESCHEDULABLE_STATUSES.includes(appointment.status) &&
    canClientChange(appointment.startAt, now, appointment.business.cancellationDeadlineHours)
  );
}

function assertOutsideDeadline(appointment: ManagedAppointment): void {
  const deadlineHours = appointment.business.cancellationDeadlineHours;
  if (deadlineHours > 0 && !canClientChange(appointment.startAt, new Date(), deadlineHours)) {
    throw new ValidationError(clientChangeDeadlineMessage(deadlineHours));
  }
}

/**
 * O cliente confirma presença pelo link (agendado → confirmado). Vale até o
 * horário começar, mesmo dentro do prazo de cancelamento (confirmar não muda a
 * agenda). Confirmar de novo não é erro: devolve o agendamento como está.
 */
export async function confirmPresenceByToken(token: string) {
  const appointment = await getAppointmentForManagement(token);

  if (appointment.status === AppointmentStatus.CONFIRMED) return appointment;
  if (appointment.status !== AppointmentStatus.PENDING) {
    throw new ValidationError("Este agendamento não pode mais ser confirmado");
  }
  if (appointment.startAt.getTime() <= Date.now()) {
    throw new ValidationError("Não é possível confirmar um agendamento que já passou");
  }

  return prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: AppointmentStatus.CONFIRMED },
  });
}

export async function cancelAppointmentByToken(token: string) {
  const appointment = await getAppointmentForManagement(token);

  if (!RESCHEDULABLE_STATUSES.includes(appointment.status)) {
    throw new ValidationError("Este agendamento não pode mais ser cancelado");
  }
  if (appointment.startAt.getTime() <= Date.now()) {
    throw new ValidationError("Não é possível cancelar um agendamento que já passou");
  }
  assertOutsideDeadline(appointment);

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
  assertOutsideDeadline(appointment);
  if (newStartAt.getTime() <= Date.now()) {
    throw new ValidationError("Escolha um horário no futuro");
  }
  // Mesmo profissional e serviço; o horário atual deste agendamento não conta como ocupado.
  await assertSlotAvailable({
    businessId: appointment.businessId,
    serviceId: appointment.serviceId,
    professionalId: appointment.professionalId,
    startAt: newStartAt,
    excludeAppointmentId: appointment.id,
  });

  const newEndAt = new Date(newStartAt.getTime() + appointment.service.durationMin * 60_000);
  const newManageTokenExpiresAt = new Date(
    newEndAt.getTime() + MANAGE_TOKEN_TTL_DAYS_AFTER_APPOINTMENT * 24 * 60 * 60 * 1000,
  );

  try {
    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { startAt: newStartAt, endAt: newEndAt, manageTokenExpiresAt: newManageTokenExpiresAt },
    });
    // O horário antigo vai no aviso ao negócio ("antes era…").
    return { appointment: updated, previousStartAt: appointment.startAt };
  } catch (error) {
    if (isOverlapConstraintViolation(error)) {
      throw new ValidationError("Esse horário acabou de deixar de estar disponível");
    }
    throw error;
  }
}
