import { AppointmentStatus, type MessageKind } from "@/generated/prisma/enums";
import type { AppointmentGetPayload } from "@/generated/prisma/models";
import { addDaysToIsoDate, localDayRangeUtc, todayInTimeZone, utcToLocalDate } from "@/lib/date";
import { buildBookingUrl, buildManageUrl } from "@/server/app-url";
import { prisma } from "@/server/db/prisma";
import { NotFoundError, ValidationError } from "@/server/errors";

import { whatsappSender } from "./sender";
import {
  DEFAULT_TEMPLATES,
  MAX_TEMPLATE_LENGTH,
  MESSAGE_KINDS,
  buildTemplateValues,
  messageKindsFor,
  renderTemplate,
} from "./templates";

export function parseMessageKind(value: unknown): MessageKind {
  if (typeof value !== "string" || !(MESSAGE_KINDS as string[]).includes(value)) {
    throw new ValidationError("Tipo de mensagem inválido");
  }
  return value as MessageKind;
}

// --- Modelos -----------------------------------------------------------------

export interface MessageTemplateDto {
  kind: MessageKind;
  body: string;
  isCustom: boolean;
}

export async function getMessageTemplates(businessId: string): Promise<MessageTemplateDto[]> {
  const saved = await prisma.messageTemplate.findMany({ where: { businessId } });
  return MESSAGE_KINDS.map((kind) => {
    const custom = saved.find((template) => template.kind === kind);
    return { kind, body: custom?.body ?? DEFAULT_TEMPLATES[kind], isCustom: Boolean(custom) };
  });
}

export async function saveMessageTemplate(businessId: string, kind: MessageKind, body: unknown): Promise<MessageTemplateDto> {
  if (typeof body !== "string" || body.trim() === "") throw new ValidationError("Escreva o texto da mensagem");
  if (body.length > MAX_TEMPLATE_LENGTH) {
    throw new ValidationError(`A mensagem pode ter no máximo ${MAX_TEMPLATE_LENGTH} caracteres`);
  }
  const text = body.trim();
  await prisma.messageTemplate.upsert({
    where: { businessId_kind: { businessId, kind } },
    create: { businessId, kind, body: text },
    update: { body: text },
  });
  return { kind, body: text, isCustom: true };
}

/** Volta ao texto padrão (apaga o personalizado). */
export async function resetMessageTemplate(businessId: string, kind: MessageKind): Promise<MessageTemplateDto> {
  await prisma.messageTemplate.deleteMany({ where: { businessId, kind } });
  return { kind, body: DEFAULT_TEMPLATES[kind], isCustom: false };
}

// --- Mensagens de um agendamento --------------------------------------------

const APPOINTMENT_MESSAGE_INCLUDE = {
  client: { select: { name: true, phone: true } },
  service: { select: { name: true } },
  professional: { select: { name: true } },
  business: { select: { name: true, address: true, timezone: true, slug: true } },
  messageLogs: { select: { kind: true, sentAt: true } },
} as const;

type AppointmentForMessage = AppointmentGetPayload<{ include: typeof APPOINTMENT_MESSAGE_INCLUDE }>;

export interface PreparedMessage {
  kind: MessageKind;
  text: string;
  url: string;
  sentAt: string | null;
}

function prepareMessages(
  appointment: AppointmentForMessage,
  templates: MessageTemplateDto[],
  kinds: MessageKind[] = MESSAGE_KINDS,
): PreparedMessage[] {
  const values = buildTemplateValues({
    clientName: appointment.client.name,
    serviceName: appointment.service.name,
    professionalName: appointment.professional.name,
    businessName: appointment.business.name,
    businessAddress: appointment.business.address,
    startAt: appointment.startAt,
    timeZone: appointment.business.timezone,
    manageUrl: buildManageUrl(appointment.manageToken),
    bookingUrl: buildBookingUrl(appointment.business.slug),
  });
  return kinds.map((kind) => {
    const text = renderTemplate(templates.find((template) => template.kind === kind)!.body, values);
    const log = appointment.messageLogs.find((entry) => entry.kind === kind);
    return {
      kind,
      text,
      url: whatsappSender.prepare(appointment.client.phone, text).url,
      sentAt: log ? log.sentAt.toISOString() : null,
    };
  });
}

/**
 * Os textos prontos (com link wa.me) que fazem sentido para o agendamento
 * agora (ver `messageKindsFor`), e o que já foi enviado.
 */
export async function getAppointmentMessages(businessId: string, appointmentId: string): Promise<PreparedMessage[]> {
  const [appointment, templates] = await Promise.all([
    prisma.appointment.findFirst({ where: { id: appointmentId, businessId }, include: APPOINTMENT_MESSAGE_INCLUDE }),
    getMessageTemplates(businessId),
  ]);
  if (!appointment) throw new NotFoundError("Agendamento não encontrado");
  return prepareMessages(appointment, templates, messageKindsFor(appointment.status, appointment.startAt, new Date()));
}

async function assertAppointmentOfBusiness(businessId: string, appointmentId: string): Promise<void> {
  const found = await prisma.appointment.findFirst({ where: { id: appointmentId, businessId }, select: { id: true } });
  if (!found) throw new NotFoundError("Agendamento não encontrado");
}

/** Marca como enviada (o dono abriu o WhatsApp com o texto). Reenviar só atualiza a hora. */
export async function markMessageSent(businessId: string, appointmentId: string, kind: MessageKind): Promise<{ sentAt: string }> {
  await assertAppointmentOfBusiness(businessId, appointmentId);
  const sentAt = new Date();
  await prisma.messageLog.upsert({
    where: { appointmentId_kind: { appointmentId, kind } },
    create: { businessId, appointmentId, kind, sentAt },
    update: { sentAt },
  });
  return { sentAt: sentAt.toISOString() };
}

export async function unmarkMessageSent(businessId: string, appointmentId: string, kind: MessageKind): Promise<void> {
  await assertAppointmentOfBusiness(businessId, appointmentId);
  await prisma.messageLog.deleteMany({ where: { businessId, appointmentId, kind } });
}

// --- Filas da tela Mensagens -------------------------------------------------

export const MESSAGE_QUEUES = ["lembretes", "pos-atendimento"] as const;
export type MessageQueue = (typeof MESSAGE_QUEUES)[number];

export interface QueueItem {
  appointmentId: string;
  startAt: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  professionalName: string;
  message: PreparedMessage;
}

/** Até quantos dias à frente a fila de lembretes procura/aceita. */
export const REMINDER_LOOKAHEAD_DAYS = 14;
const ACTIVE_STATUSES = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED];

/**
 * Próximo dia (a partir de amanhã) com atendimento marcado: no sábado, se
 * domingo está vazio, a fila já abre na segunda. Sem nada à frente, amanhã.
 */
async function nextReminderDay(businessId: string, scope: { professionalId?: string }, today: string, timeZone: string): Promise<string> {
  const tomorrow = addDaysToIsoDate(today, 1);
  const next = await prisma.appointment.findFirst({
    where: {
      businessId,
      ...scope,
      status: { in: ACTIVE_STATUSES },
      startAt: {
        gte: localDayRangeUtc(tomorrow, timeZone).start,
        lt: localDayRangeUtc(addDaysToIsoDate(today, REMINDER_LOOKAHEAD_DAYS), timeZone).end,
      },
    },
    orderBy: { startAt: "asc" },
    select: { startAt: true },
  });
  return next ? utcToLocalDate(next.startAt, timeZone) : tomorrow;
}

/**
 * Lembretes: pendentes/confirmados de um dia (padrão: o próximo dia com
 * atendimento; `date` escolhe outro, de hoje até 14 dias à frente).
 * Pós-atendimento: concluídos de ontem e hoje. Mostra também os já enviados,
 * marcados, para o dono ver o progresso ("3 de 8 enviados").
 */
export async function getMessageQueue(
  businessId: string,
  queue: MessageQueue,
  /** Profissional: só os atendimentos dele. */
  scope: { professionalId?: string } = {},
  /** Lembretes: dia escolhido (YYYY-MM-DD). */
  date?: string | null,
): Promise<{ date: string; today: string; items: QueueItem[] }> {
  const business = await prisma.business.findFirst({ where: { id: businessId, deletedAt: null }, select: { timezone: true } });
  if (!business) throw new NotFoundError("Negócio não encontrado");
  const today = todayInTimeZone(business.timezone);
  const isReminder = queue === "lembretes";
  if (isReminder && date != null) {
    const lastDay = addDaysToIsoDate(today, REMINDER_LOOKAHEAD_DAYS);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today || date > lastDay) {
      throw new ValidationError(`Escolha um dia entre hoje e os próximos ${REMINDER_LOOKAHEAD_DAYS} dias`);
    }
  }
  const firstDay = isReminder
    ? (date ?? (await nextReminderDay(businessId, scope, today, business.timezone)))
    : addDaysToIsoDate(today, -1);
  const lastDay = isReminder ? firstDay : today;
  const start = localDayRangeUtc(firstDay, business.timezone).start;
  const end = localDayRangeUtc(lastDay, business.timezone).end;
  const kind: MessageKind = isReminder ? "REMINDER" : "FOLLOW_UP";

  const [appointments, templates] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        businessId,
        ...scope,
        startAt: { gte: start, lt: end },
        status: isReminder ? { in: ACTIVE_STATUSES } : AppointmentStatus.COMPLETED,
      },
      include: APPOINTMENT_MESSAGE_INCLUDE,
      orderBy: { startAt: "asc" },
    }),
    getMessageTemplates(businessId),
  ]);

  return {
    date: firstDay,
    today,
    items: appointments.map((appointment) => ({
      appointmentId: appointment.id,
      startAt: appointment.startAt.toISOString(),
      clientName: appointment.client.name,
      clientPhone: appointment.client.phone,
      serviceName: appointment.service.name,
      professionalName: appointment.professional.name,
      message: prepareMessages(appointment, templates, [kind])[0],
    })),
  };
}
