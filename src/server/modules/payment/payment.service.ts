import { AppointmentStatus, type PaymentMethod } from "@/generated/prisma/enums";
import { localDayRangeUtc, todayInTimeZone } from "@/lib/date";
import { prisma } from "@/server/db/prisma";
import { NotFoundError, ValidationError } from "@/server/errors";
import { canTransition } from "@/server/modules/appointment/appointment.service";
import { isStatusChangeAvailable, NOT_STARTED_MESSAGE } from "@/server/modules/appointment/status-rules";
import { summarizeRevenue } from "@/server/modules/report/report-rules";
import { loadCompletedValues } from "@/server/modules/report/report.service";

import {
  commissionFor,
  summarizePayments,
  validatePaymentInput,
  validatePriceCents,
  type PaymentSummary,
} from "./payment-rules";

/**
 * Registro de pagamentos externos e números do Financeiro. Toda query filtra
 * pelo businessId da sessão (nunca vindo do client).
 */

export interface RegisterPaymentInput {
  amountCents: number;
  discountCents: number;
  method: PaymentMethod;
  receivedAt: Date;
  note?: string | null;
  /** Ajuste do valor do atendimento (ex.: serviço "a partir de"). */
  priceCents?: number;
}

export interface FinanceRange {
  /** YYYY-MM-DD, datas locais do negócio (inclusivas). */
  startDate: string;
  endDate: string;
}

async function businessTimezone(businessId: string): Promise<string> {
  const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId }, select: { timezone: true } });
  return business.timezone;
}

function rangeToUtc(range: FinanceRange, timeZone: string) {
  return { start: localDayRangeUtc(range.startDate, timeZone).start, end: localDayRangeUtc(range.endDate, timeZone).end };
}

const activePayments = { deletedAt: null } as const;

/** Pagamentos e situação de um atendimento (drawer da agenda). */
export async function getAppointmentPayments(businessId: string, appointmentId: string) {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, businessId },
    select: {
      priceCents: true,
      payments: { where: activePayments, orderBy: { receivedAt: "asc" } },
    },
  });
  if (!appointment) throw new NotFoundError("Agendamento não encontrado");
  // "Registrado por": nome de quem lançou (dono ou o próprio profissional).
  const authorIds = [...new Set(appointment.payments.map((p) => p.createdByUserId).filter((id): id is string => id != null))];
  const authors = authorIds.length
    ? new Map(
        (await prisma.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]),
      )
    : new Map<string, string>();
  return {
    payments: appointment.payments.map((payment) => ({
      ...payment,
      createdByName: payment.createdByUserId ? (authors.get(payment.createdByUserId) ?? null) : null,
    })),
    summary: summarizePayments(appointment.priceCents, appointment.payments),
  };
}

/**
 * Valida e grava um recebimento dentro de uma transação já aberta. A % de
 * comissão do profissional é congelada aqui (decisão: comissão por pagamento).
 */
async function insertPayment(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  businessId: string,
  appointment: { id: string; professional: { commissionPercent: number | null } },
  input: RegisterPaymentInput,
  timeZone: string,
  createdByUserId: string | null,
) {
  const endOfToday = localDayRangeUtc(todayInTimeZone(timeZone), timeZone).end;
  const problem = validatePaymentInput(input, endOfToday);
  if (problem) throw new ValidationError(problem);
  if (input.priceCents !== undefined) {
    const priceProblem = validatePriceCents(input.priceCents);
    if (priceProblem) throw new ValidationError(priceProblem);
    await tx.appointment.update({ where: { id: appointment.id }, data: { priceCents: input.priceCents } });
  }
  return tx.payment.create({
    data: {
      businessId,
      appointmentId: appointment.id,
      amountCents: input.amountCents,
      discountCents: input.discountCents,
      method: input.method,
      receivedAt: input.receivedAt,
      note: input.note?.trim() || null,
      commissionPercent: appointment.professional.commissionPercent,
      createdByUserId,
    },
  });
}

/**
 * Registra um recebimento em qualquer status: sinal antes do atendimento,
 * taxa de falta, sinal retido num cancelado. "A receber" só olha concluídos.
 */
export async function registerPayment(
  businessId: string,
  appointmentId: string,
  input: RegisterPaymentInput,
  createdByUserId: string | null = null,
) {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, businessId },
    select: { id: true, professional: { select: { commissionPercent: true } } },
  });
  if (!appointment) throw new NotFoundError("Agendamento não encontrado");
  const timeZone = await businessTimezone(businessId);
  return prisma.$transaction((tx) => insertPayment(tx, businessId, appointment, input, timeZone, createdByUserId));
}

/** "Concluir e receber": conclui e, se vier pagamento, registra na MESMA transação. */
export async function completeAppointment(
  businessId: string,
  appointmentId: string,
  payment?: RegisterPaymentInput,
  createdByUserId: string | null = null,
) {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, businessId },
    select: { id: true, status: true, startAt: true, professional: { select: { commissionPercent: true } } },
  });
  if (!appointment) throw new NotFoundError("Agendamento não encontrado");
  if (!canTransition(appointment.status, AppointmentStatus.COMPLETED)) {
    throw new ValidationError("Só agendamentos confirmados podem ser concluídos");
  }
  if (!isStatusChangeAvailable(AppointmentStatus.COMPLETED, appointment.startAt, new Date())) {
    throw new ValidationError(NOT_STARTED_MESSAGE);
  }
  const timeZone = await businessTimezone(businessId);
  return prisma.$transaction(async (tx) => {
    await tx.appointment.update({ where: { id: appointment.id }, data: { status: AppointmentStatus.COMPLETED } });
    if (payment) await insertPayment(tx, businessId, appointment, payment, timeZone, createdByUserId);
    return { id: appointment.id, status: AppointmentStatus.COMPLETED };
  });
}

/** Remove (soft delete) um recebimento lançado por engano. */
export async function deletePayment(businessId: string, paymentId: string) {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, businessId, ...activePayments },
    select: { id: true },
  });
  if (!payment) throw new NotFoundError("Pagamento não encontrado");
  await prisma.payment.update({ where: { id: paymentId }, data: { deletedAt: new Date() } });
}

export interface PaymentRow {
  id: string;
  appointmentId: string;
  amountCents: number;
  discountCents: number;
  method: PaymentMethod;
  receivedAt: string;
  note: string | null;
  clientName: string;
  serviceName: string;
  professional: { id: string; name: string };
}

/** Recebimentos do período, pela DATA DE RECEBIMENTO (regra do financeiro). */
export async function listPayments(
  businessId: string,
  range: FinanceRange,
  filters: { method?: PaymentMethod; professionalId?: string } = {},
): Promise<PaymentRow[]> {
  const { start, end } = rangeToUtc(range, await businessTimezone(businessId));
  const payments = await prisma.payment.findMany({
    where: {
      businessId,
      ...activePayments,
      receivedAt: { gte: start, lt: end },
      ...(filters.method ? { method: filters.method } : {}),
      ...(filters.professionalId ? { appointment: { professionalId: filters.professionalId } } : {}),
    },
    include: {
      appointment: {
        select: {
          client: { select: { name: true } },
          service: { select: { name: true } },
          professional: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { receivedAt: "desc" },
  });
  return payments.map((p) => ({
    id: p.id,
    appointmentId: p.appointmentId,
    amountCents: p.amountCents,
    discountCents: p.discountCents,
    method: p.method,
    receivedAt: p.receivedAt.toISOString(),
    note: p.note,
    clientName: p.appointment.client.name,
    serviceName: p.appointment.service.name,
    professional: p.appointment.professional,
  }));
}

export interface ReceivableRow {
  appointmentId: string;
  startAt: string;
  clientName: string;
  serviceName: string;
  professionalName: string;
  summary: PaymentSummary;
}

/** Concluídos com saldo em aberto (independe do período: é o que falta receber hoje). */
export async function listReceivables(
  businessId: string,
  scope: { professionalId?: string } = {},
): Promise<ReceivableRow[]> {
  const appointments = await prisma.appointment.findMany({
    where: { businessId, status: AppointmentStatus.COMPLETED, ...scope },
    select: {
      id: true,
      startAt: true,
      priceCents: true,
      client: { select: { name: true } },
      service: { select: { name: true } },
      professional: { select: { name: true } },
      payments: { where: activePayments, select: { amountCents: true, discountCents: true } },
    },
    orderBy: { startAt: "desc" },
  });
  return appointments
    .map((a) => ({
      appointmentId: a.id,
      startAt: a.startAt.toISOString(),
      clientName: a.client.name,
      serviceName: a.service.name,
      professionalName: a.professional.name,
      summary: summarizePayments(a.priceCents, a.payments),
    }))
    .filter((row) => row.summary.balanceCents > 0);
}

export interface FinanceSummary {
  receivedCents: number;
  discountCents: number;
  paymentsCount: number;
  /** Valor médio por atendimento concluído no período (ver summarizeRevenue). */
  averageTicketCents: number | null;
  receivableCents: number;
  receivableCount: number;
  byMethod: { method: PaymentMethod; amountCents: number; count: number }[];
}

export async function getFinanceSummary(businessId: string, range: FinanceRange): Promise<FinanceSummary> {
  const { start, end } = rangeToUtc(range, await businessTimezone(businessId));
  const [payments, receivables, completed] = await Promise.all([
    prisma.payment.findMany({
      where: { businessId, ...activePayments, receivedAt: { gte: start, lt: end } },
      select: { appointmentId: true, amountCents: true, discountCents: true, method: true },
    }),
    listReceivables(businessId),
    loadCompletedValues(businessId, start, end),
  ]);

  // Mesma regra dos Relatórios (ticket médio, formas de pagamento).
  return {
    ...summarizeRevenue(payments, completed),
    receivableCents: receivables.reduce((sum, r) => sum + r.summary.balanceCents, 0),
    receivableCount: receivables.length,
  };
}

export interface CommissionRow {
  professional: { id: string; name: string; commissionPercent: number | null };
  receivedCents: number;
  commissionCents: number;
  paymentsCount: number;
}

/**
 * Comissão por profissional no período: soma, pagamento a pagamento, da %
 * congelada no registro sobre o valor recebido (data de recebimento).
 */
export async function getCommissions(businessId: string, range: FinanceRange): Promise<CommissionRow[]> {
  const { start, end } = rangeToUtc(range, await businessTimezone(businessId));
  const [professionals, payments] = await Promise.all([
    prisma.professional.findMany({
      where: { businessId, deletedAt: null },
      select: { id: true, name: true, commissionPercent: true, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.payment.findMany({
      where: { businessId, ...activePayments, receivedAt: { gte: start, lt: end } },
      select: { amountCents: true, commissionPercent: true, appointment: { select: { professionalId: true } } },
    }),
  ]);

  const rows: CommissionRow[] = [];
  for (const professional of professionals) {
    const own = payments.filter((p) => p.appointment.professionalId === professional.id);
    // Inativos só aparecem se tiveram recebimento no período.
    if (!professional.active && own.length === 0) continue;
    rows.push({
      professional: { id: professional.id, name: professional.name, commissionPercent: professional.commissionPercent },
      receivedCents: own.reduce((sum, p) => sum + p.amountCents, 0),
      commissionCents: own.reduce((sum, p) => sum + commissionFor(p), 0),
      paymentsCount: own.length,
    });
  }
  return rows;
}
