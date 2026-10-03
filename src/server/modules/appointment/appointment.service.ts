import { AppointmentStatus, type Prisma } from "@/generated/prisma/client";
import { normalizePhoneBR } from "@/lib/phone";
import { prisma } from "@/server/db/prisma";
import { checkAdminBookingTime } from "./admin-booking-rules";
import { assertSlotAvailable } from "./availability";
import { checkAdminReschedule } from "./reschedule-rules";
import { NotFoundError, ValidationError } from "@/server/errors";

/**
 * Transições de status permitidas. Qualquer transição fora desse mapa é
 * rejeitada — evita, por exemplo, "reabrir" um agendamento já concluído.
 */
const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  // "Agendado" só existe em registros antigos (hoje toda reserva nasce confirmada);
  // eles também podem ser concluídos ou virar falta direto.
  [AppointmentStatus.PENDING]: [
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
  ],
  [AppointmentStatus.CONFIRMED]: [
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
  ],
  [AppointmentStatus.CANCELLED]: [],
  [AppointmentStatus.COMPLETED]: [],
  [AppointmentStatus.NO_SHOW]: [],
};

/** A transição de status é permitida? (mesma regra para a agenda e o "concluir e receber"). */
export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

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
      // Para o indicador pago/pendente dos concluídos na agenda.
      payments: { where: { deletedAt: null }, select: { amountCents: true, discountCents: true } },
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
  /** Quem marcou pelo painel (null/ausente = cliente pela página pública). */
  createdByUserId?: string | null;
  /**
   * Telefone já cadastrado mantém o nome do cadastro (encaixe feito por um
   * profissional: um erro de digitação dele não renomeia o cliente para o
   * colega e para o dono).
   */
  keepExistingClientName?: boolean;
}

export const MANAGE_TOKEN_TTL_DAYS_AFTER_APPOINTMENT = 30;

/**
 * Núcleo compartilhado de criação de agendamento, usado tanto pelo encaixe
 * manual do admin quanto pela reserva pública. Reaproveita a mesma proteção
 * de concorrência nos dois casos: se dois agendamentos colidirem, a
 * exclusion constraint do Postgres rejeita a segunda gravação.
 */
async function insertAppointment(params: InsertAppointmentParams) {
  const { businessId, professionalId, serviceId, startAt, client, notes, createdByUserId, keepExistingClientName } = params;

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
    update: keepExistingClientName ? {} : { name: client.name, email: client.email },
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
        // Reserva já nasce confirmada: quem reservou pela página quer ir, e o encaixe do painel
        // foi combinado com o cliente. O link do cliente serve para cancelar ou remarcar.
        status: AppointmentStatus.CONFIRMED,
        notes,
        manageTokenExpiresAt,
        // Valor do atendimento congelado na marcação (ajustável ao receber).
        priceCents: service.priceCents,
        createdByUserId: createdByUserId ?? null,
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

/**
 * Regras de horário do painel (passado + expediente) para um profissional do
 * negócio. `allowOutsideHours`: o dono confirmou que está cobrindo fora do
 * expediente.
 */
async function assertAdminBookingTime(
  businessId: string,
  professionalId: string,
  startAt: Date,
  durationMin: number,
  allowOutsideHours: boolean,
) {
  const [business, weeklyHours, closures] = await Promise.all([
    prisma.business.findUniqueOrThrow({ where: { id: businessId }, select: { timezone: true } }),
    prisma.workingHours.findMany({ where: { professionalId, professional: { businessId } } }),
    // Poucos registros por negócio: a regra pura escolhe o que cobre a data.
    prisma.businessClosure.findMany({ where: { businessId }, select: { startDate: true, endDate: true, reason: true } }),
  ]);
  const problem = checkAdminBookingTime({
    startAt,
    durationMin,
    now: new Date(),
    timeZone: business.timezone,
    weeklyHours,
    allowOutsideHours,
    closures,
  });
  if (problem) throw new ValidationError(problem.message, problem.code);
}

/**
 * Encaixe manual pelo admin, direto na agenda (sem passar pela página
 * pública). Não usa a disponibilidade (o dono pode encaixar), mas recusa
 * passado, bloqueio e serviço que o profissional não faz; fora do expediente
 * só com confirmação explícita.
 */
export async function createManualAppointment(
  params: InsertAppointmentParams & { allowOutsideHours?: boolean },
) {
  const { allowOutsideHours = false, ...insertParams } = params;
  const service = await prisma.service.findFirst({
    where: { id: params.serviceId, businessId: params.businessId, active: true, deletedAt: null },
    include: { professionalServices: { where: { professionalId: params.professionalId } } },
  });
  if (!service) throw new NotFoundError("Cadastro não encontrado");
  if (service.professionalServices.length === 0) {
    throw new ValidationError("Esse cadastro não realiza este serviço");
  }

  await assertAdminBookingTime(
    params.businessId,
    params.professionalId,
    params.startAt,
    service.durationMin,
    allowOutsideHours,
  );

  const endAt = new Date(params.startAt.getTime() + service.durationMin * 60_000);
  const blocked = await prisma.timeBlock.count({
    where: { professionalId: params.professionalId, startAt: { lt: endAt }, endAt: { gt: params.startAt } },
  });
  if (blocked > 0) throw new ValidationError("Esse horário está bloqueado na agenda");

  return insertAppointment(insertParams);
}

/** Reserva feita pelo cliente final na página pública, sem login. */
export async function createPublicAppointment(params: InsertAppointmentParams) {
  // Serviço oculto da página pública não pode ser reservado nem chamando a API direto.
  const bookable = await prisma.service.count({
    where: { id: params.serviceId, businessId: params.businessId, visibleOnline: true, active: true, deletedAt: null },
  });
  if (bookable === 0) throw new NotFoundError("Cadastro não encontrado");
  await assertSlotAvailable({
    businessId: params.businessId,
    serviceId: params.serviceId,
    professionalId: params.professionalId,
    startAt: params.startAt,
  });
  return insertAppointment(params);
}

export async function updateAppointmentStatus(
  businessId: string,
  appointmentId: string,
  nextStatus: AppointmentStatus,
  actorUserId?: string,
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
    data: {
      status: nextStatus,
      // Quem cancelou pelo painel (o cancelamento pelo link do cliente fica sem usuário).
      ...(nextStatus === AppointmentStatus.CANCELLED ? { cancelledByUserId: actorUserId ?? null } : {}),
    },
  });
}

export function isOverlapConstraintViolation(error: unknown): boolean {
  const prismaError = error as Prisma.PrismaClientKnownRequestError | undefined;
  // A exclusion constraint do Postgres não tem código de erro Prisma dedicado:
  // com o driver adapter (`pg`) o erro chega como DriverAdapterError, com o
  // nome da constraint na mensagem. Checamos a mensagem (e `meta`, por garantia).
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
  input: { startAt: Date; professionalId: string; allowOutsideHours?: boolean },
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

  await assertAdminBookingTime(
    businessId,
    professional.id,
    newStartAt,
    appointment.service.durationMin,
    input.allowOutsideHours ?? false,
  );

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

/** Nome e papel de quem fez algo no painel ("quem fez"), ou null (página pública / link). */
async function actorsById(userIds: (string | null)[]) {
  const ids = [...new Set(userIds.filter((id): id is string => id != null))];
  if (ids.length === 0) return new Map<string, { name: string; role: "OWNER" | "PROFESSIONAL" }>();
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, role: true } });
  return new Map(users.map((user) => [user.id, { name: user.name, role: user.role }]));
}

/**
 * Detalhe para o drawer da agenda, com o histórico recente do cliente.
 * `scope` (profissional): histórico e contagens só dos atendimentos com ele —
 * ele não fica sabendo que o cliente também é atendido por um colega.
 */
export async function getAppointmentDetail(
  businessId: string,
  appointmentId: string,
  scope: { professionalId?: string } = {},
) {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, businessId, ...scope },
    include: {
      professional: { select: { id: true, name: true } },
      service: { select: { id: true, name: true, durationMin: true, priceCents: true } },
      client: { select: { id: true, name: true, phone: true, email: true } },
    },
  });
  if (!appointment) throw new NotFoundError("Agendamento não encontrado");

  const clientWhere = { businessId, clientId: appointment.clientId, ...scope };
  const [history, completedCount, noShowCount, actors] = await Promise.all([
    prisma.appointment.findMany({
      where: { ...clientWhere, id: { not: appointment.id } },
      select: { id: true, startAt: true, status: true, service: { select: { name: true } } },
      orderBy: { startAt: "desc" },
      take: CLIENT_HISTORY_LIMIT,
    }),
    prisma.appointment.count({ where: { ...clientWhere, status: "COMPLETED" } }),
    prisma.appointment.count({ where: { ...clientWhere, status: "NO_SHOW" } }),
    actorsById([appointment.createdByUserId, appointment.cancelledByUserId]),
  ]);

  return {
    appointment,
    history,
    clientStats: { completed: completedCount, noShows: noShowCount },
    audit: {
      createdBy: appointment.createdByUserId ? (actors.get(appointment.createdByUserId) ?? null) : null,
      cancelledBy: appointment.cancelledByUserId ? (actors.get(appointment.cancelledByUserId) ?? null) : null,
    },
  };
}
