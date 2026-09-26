import { AppointmentStatus, type Prisma } from "@/generated/prisma/client";
import { normalizePhoneBR } from "@/lib/phone";
import { prisma } from "@/server/db/prisma";
import { checkAdminReschedule } from "./reschedule-rules";
import { NotFoundError, ValidationError } from "@/server/errors";

/**
 * Transições de status permitidas. Qualquer transição fora desse mapa é
 * rejeitada — evita, por exemplo, "reabrir" um agendamento já concluído.
 */
const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  [AppointmentStatus.PENDING]: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
  [AppointmentStatus.CONFIRMED]: [
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
  ],
  [AppointmentStatus.CANCELLED]: [],
  [AppointmentStatus.COMPLETED]: [],
  [AppointmentStatus.NO_SHOW]: [],
};

export interface ListAppointmentsParams {
  businessId: string;
  professionalId?: string;
  startAt: Date;
  endAt: Date;
}

export function listAppointments(params: ListAppointmentsParams) {
  const { businessId, professionalId, startAt, endAt } = params;
  return prisma.appointment.findMany({
    where: {
      businessId,
      ...(professionalId ? { professionalId } : {}),
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    include: {
      professional: { select: { id: true, name: true } },
      service: { select: { id: true, name: true, durationMin: true } },
      client: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { startAt: "asc" },
  });
}

export interface ListTimeBlocksParams {
  businessId: string;
  professionalId?: string;
  startAt: Date;
  endAt: Date;
}

export function listTimeBlocksInRange(params: ListTimeBlocksParams) {
  const { businessId, professionalId, startAt, endAt } = params;
  return prisma.timeBlock.findMany({
    where: {
      professional: { businessId, ...(professionalId ? { id: professionalId } : {}) },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { id: true, professionalId: true, startAt: true, endAt: true, reason: true },
    orderBy: { startAt: "asc" },
  });
}

export interface InsertAppointmentParams {
  businessId: string;
  professionalId: string;
  serviceId: string;
  startAt: Date;
  client: { name: string; phone: string; email?: string };
  notes?: string;
}

export const MANAGE_TOKEN_TTL_DAYS_AFTER_APPOINTMENT = 30;

/**
 * Núcleo compartilhado de criação de agendamento, usado tanto pelo encaixe
 * manual do admin quanto pela reserva pública. Reaproveita a mesma proteção
 * de concorrência nos dois casos: se dois agendamentos colidirem, a
 * exclusion constraint do Postgres rejeita a segunda gravação.
 */
async function insertAppointment(params: InsertAppointmentParams) {
  const { businessId, professionalId, serviceId, startAt, client, notes } = params;

  const [professional, service] = await Promise.all([
    prisma.professional.findFirst({
      where: { id: professionalId, businessId, active: true, deletedAt: null },
    }),
    prisma.service.findFirst({
      where: { id: serviceId, businessId, active: true, deletedAt: null },
    }),
  ]);
  if (!professional) throw new NotFoundError("Cadastro não encontrado");
  if (!service) throw new NotFoundError("Cadastro não encontrado");

  const phone = normalizePhoneBR(client.phone);
  if (phone.length < 10) throw new ValidationError("Telefone inválido: informe DDD e número");

  const endAt = new Date(startAt.getTime() + service.durationMin * 60_000);
  const manageTokenExpiresAt = new Date(
    endAt.getTime() + MANAGE_TOKEN_TTL_DAYS_AFTER_APPOINTMENT * 24 * 60 * 60 * 1000,
  );

  const clientRecord = await prisma.client.upsert({
    where: { businessId_phone: { businessId, phone } },
    update: { name: client.name, email: client.email },
    create: { businessId, name: client.name, phone, email: client.email },
  });

  try {
    return await prisma.appointment.create({
      data: {
        businessId,
        professionalId,
        serviceId,
        clientId: clientRecord.id,
        startAt,
        endAt,
        status: AppointmentStatus.CONFIRMED,
        notes,
        manageTokenExpiresAt,
      },
      include: { professional: true, service: true, client: true, business: true },
    });
  } catch (error) {
    if (isOverlapConstraintViolation(error)) {
      throw new ValidationError("Esse horário acabou de deixar de estar disponível");
    }
    throw error;
  }
}

/** Encaixe manual pelo admin, direto na agenda (sem passar pela página pública). */
export function createManualAppointment(params: InsertAppointmentParams) {
  return insertAppointment(params);
}

/** Reserva feita pelo cliente final na página pública, sem login. */
export function createPublicAppointment(params: InsertAppointmentParams) {
  return insertAppointment(params);
}

export async function updateAppointmentStatus(
  businessId: string,
  appointmentId: string,
  nextStatus: AppointmentStatus,
) {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, businessId },
  });
  if (!appointment) {
    throw new NotFoundError("Agendamento não encontrado");
  }

  const allowed = ALLOWED_TRANSITIONS[appointment.status];
  if (!allowed.includes(nextStatus)) {
    throw new ValidationError(
      `Não é possível mudar de "${appointment.status}" para "${nextStatus}"`,
    );
  }

  return prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: nextStatus },
  });
}

export function isOverlapConstraintViolation(error: unknown): boolean {
  const prismaError = error as Prisma.PrismaClientKnownRequestError | undefined;
  // P2010: erro de execução de query bruta / constraint do banco não mapeada
  // pelo Prisma; checamos a mensagem porque a exclusion constraint do
  // Postgres não tem um código de erro Prisma dedicado.
  return Boolean(
    prismaError?.message?.includes("no_overlapping_appointments") ||
      (prismaError as { meta?: { constraint?: string } })?.meta?.constraint ===
        "no_overlapping_appointments",
  );
}

/**
 * Remarcação pelo admin: muda horário e/ou profissional. Revalida tudo no
 * servidor (a checagem da tela é só otimista); conflito com outro agendamento
 * é barrado pela exclusion constraint do banco.
 */
export async function rescheduleAppointmentAsAdmin(
  businessId: string,
  appointmentId: string,
  input: { startAt: Date; professionalId: string },
) {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, businessId },
    include: { service: true },
  });
  if (!appointment) throw new NotFoundError("Agendamento não encontrado");

  const professional = await prisma.professional.findFirst({
    where: { id: input.professionalId, businessId, deletedAt: null },
    include: { professionalServices: { where: { serviceId: appointment.serviceId } } },
  });
  if (!professional) throw new NotFoundError("Cadastro não encontrado");

  const newStartAt = input.startAt;
  const newEndAt = new Date(newStartAt.getTime() + appointment.service.durationMin * 60_000);
  const blocks = await prisma.timeBlock.findMany({
    where: { professionalId: professional.id, startAt: { lt: newEndAt }, endAt: { gt: newStartAt } },
    select: { startAt: true, endAt: true },
  });

  const problem = checkAdminReschedule({
    status: appointment.status,
    professionalActive: professional.active,
    professionalOffersService: professional.professionalServices.length > 0,
    newStartAt,
    newEndAt,
    blocks,
  });
  if (problem) throw new ValidationError(problem);

  try {
    return await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        professionalId: professional.id,
        startAt: newStartAt,
        endAt: newEndAt,
        manageTokenExpiresAt: new Date(
          newEndAt.getTime() + MANAGE_TOKEN_TTL_DAYS_AFTER_APPOINTMENT * 24 * 60 * 60 * 1000,
        ),
      },
    });
  } catch (error) {
    if (isOverlapConstraintViolation(error)) {
      throw new ValidationError("Esse horário conflita com outro agendamento");
    }
    throw error;
  }
}

const CLIENT_HISTORY_LIMIT = 5;

/** Detalhe para o drawer da agenda, com o histórico recente do cliente. */
export async function getAppointmentDetail(businessId: string, appointmentId: string) {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, businessId },
    include: {
      professional: { select: { id: true, name: true } },
      service: { select: { id: true, name: true, durationMin: true, priceCents: true } },
      client: { select: { id: true, name: true, phone: true, email: true } },
    },
  });
  if (!appointment) throw new NotFoundError("Agendamento não encontrado");

  const [history, completedCount, noShowCount] = await Promise.all([
    prisma.appointment.findMany({
      where: { businessId, clientId: appointment.clientId, id: { not: appointment.id } },
      select: { id: true, startAt: true, status: true, service: { select: { name: true } } },
      orderBy: { startAt: "desc" },
      take: CLIENT_HISTORY_LIMIT,
    }),
    prisma.appointment.count({ where: { businessId, clientId: appointment.clientId, status: "COMPLETED" } }),
    prisma.appointment.count({ where: { businessId, clientId: appointment.clientId, status: "NO_SHOW" } }),
  ]);

  return { appointment, history, clientStats: { completed: completedCount, noShows: noShowCount } };
}
