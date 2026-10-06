import type { AppointmentStatus } from "@/generated/prisma/enums";
import { localDayRangeUtc, todayInTimeZone } from "@/lib/date";
import { prisma } from "@/server/db/prisma";
import { commissionFor } from "@/server/modules/payment/payment-rules";
import { listReceivables } from "@/server/modules/payment/payment.service";

import {
  availableMinutes,
  computeNoShowRate,
  computeOccupancyRate,
  datesInRange,
  isLate,
  monthRange,
  workingWindows,
} from "./metrics";

/** Dias sem voltar a partir dos quais o cliente conta como "sumido" no alerta do Início. */
export const INACTIVE_CLIENT_DAYS = 60;

export interface DashboardAppointment {
  id: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  isLate: boolean;
  clientName: string;
  serviceName: string;
  professionalName: string;
}

export interface DashboardData {
  today: string;
  todayAppointments: DashboardAppointment[];
  month: {
    appointments: number;
    noShowRate: number | null;
    occupancyRate: number | null;
    newClients: number;
    /** Recebido no mês (data de recebimento). */
    receivedCents: number;
    /** Comissão do mês (só na versão do profissional; null para o dono). */
    myCommissionCents: number | null;
  };
  /** Concluídos com saldo em aberto, de qualquer data (mesma regra do Financeiro). */
  receivable: { cents: number; count: number };
  alerts: {
    professionalsWithoutHours: { id: string; name: string }[];
    inactiveClients: number;
    /** Concluídos sem NENHUM recebimento registrado (provável esquecimento) — alerta vermelho. */
    completedWithoutPayment: { count: number; cents: number };
    /** Concluídos com pagamento parcial (ex.: só o sinal) — alerta amarelo; `cents` = quanto falta. */
    completedPartialPayment: { count: number; cents: number };
    /** Reservas feitas pela página pública (sem autor do painel) nas últimas 24 h, não canceladas. */
    recentOnlineBookings: { count: number; latest: { id: string; startAt: string; clientName: string; serviceName: string }[] };
    /** Já terminaram e continuam confirmados/agendados: falta concluir ou marcar falta (os mais recentes primeiro). */
    pastWithoutOutcome: { count: number; latest: { id: string; startAt: string; clientName: string; serviceName: string }[] };
  };
}

/** Quantos itens os alertas do Início listam (o resto entra só na contagem). */
const ALERT_LIST_LIMIT = 3;

/** Janela do aviso "reservas novas pela página" no Início. */
export const RECENT_ONLINE_BOOKING_HOURS = 24;

const totalReceivable = (rows: { summary: { balanceCents: number } }[]) => ({
  count: rows.length,
  cents: rows.reduce((sum, row) => sum + row.summary.balanceCents, 0),
});

/**
 * Números do Início. `scope` (profissional): tudo só dos atendimentos dele,
 * mais a comissão dele no mês; o dono vê o negócio inteiro.
 */
export async function getDashboard(
  businessId: string,
  timeZone: string,
  now = new Date(),
  scope: { professionalId?: string } = {},
): Promise<DashboardData> {
  const today = todayInTimeZone(timeZone);
  const todayRange = localDayRangeUtc(today, timeZone);
  const { startDate, endDate } = monthRange(today);
  const monthStart = localDayRangeUtc(startDate, timeZone).start;
  const monthEnd = localDayRangeUtc(endDate, timeZone).end;
  const inactiveSince = new Date(now.getTime() - INACTIVE_CLIENT_DAYS * 24 * 60 * 60 * 1000);
  const onlineBookingsWhere = {
    businessId,
    ...scope,
    createdByUserId: null,
    status: { not: "CANCELLED" as const },
    createdAt: { gte: new Date(now.getTime() - RECENT_ONLINE_BOOKING_HOURS * 60 * 60 * 1000) },
  };
  // Terminou e ninguém registrou o desfecho: some dos números (ocupação, faltas) até alguém concluir ou marcar falta.
  const pastOpenWhere = { businessId, ...scope, status: { in: ["PENDING" as const, "CONFIRMED" as const] }, endAt: { lte: now } };
  const listInclude = { client: { select: { name: true } }, service: { select: { name: true } } };
  const [recentOnlineCount, recentOnline, pastOpenCount, pastOpen] = await Promise.all([
    prisma.appointment.count({ where: onlineBookingsWhere }),
    prisma.appointment.findMany({
      where: onlineBookingsWhere,
      include: listInclude,
      orderBy: { createdAt: "desc" },
      take: ALERT_LIST_LIMIT,
    }),
    prisma.appointment.count({ where: pastOpenWhere }),
    prisma.appointment.findMany({ where: pastOpenWhere, include: listInclude, orderBy: { startAt: "desc" }, take: ALERT_LIST_LIMIT }),
  ]);
  const toListItem = (a: (typeof pastOpen)[number]) => ({
    id: a.id,
    startAt: a.startAt.toISOString(),
    clientName: a.client.name,
    serviceName: a.service.name,
  });

  const [todayAppointments, monthAppointments, professionals, blocks, firstVisits, inactiveClients, received, receivables] =
    await Promise.all([
      prisma.appointment.findMany({
        where: { businessId, ...scope, status: { not: "CANCELLED" }, startAt: { gte: todayRange.start, lt: todayRange.end } },
        include: { client: true, service: true, professional: true },
        orderBy: { startAt: "asc" },
      }),
      prisma.appointment.findMany({
        where: { businessId, ...scope, startAt: { gte: monthStart, lt: monthEnd } },
        select: { status: true, startAt: true, endAt: true },
      }),
      prisma.professional.findMany({
        where: { businessId, active: true, deletedAt: null, ...(scope.professionalId ? { id: scope.professionalId } : {}) },
        select: { id: true, name: true, workingHours: true },
        orderBy: { name: "asc" },
      }),
      prisma.timeBlock.findMany({
        where: { professional: { businessId, active: true, deletedAt: null, ...(scope.professionalId ? { id: scope.professionalId } : {}) }, startAt: { lt: monthEnd }, endAt: { gt: monthStart } },
        select: { professionalId: true, startAt: true, endAt: true },
      }),
      // Primeira visita de cada cliente: é "novo" no mês se ela cai no mês.
      prisma.appointment.groupBy({
        by: ["clientId"],
        where: { businessId, ...scope, status: { not: "CANCELLED" } },
        _min: { startAt: true },
      }),
      // Sem atendimento concluído nos últimos N dias e sem nada marcado para frente.
      prisma.client.count({
        where: {
          businessId,
          appointments: {
            some: { status: "COMPLETED", ...scope },
            none: {
              OR: [
                { status: "COMPLETED", ...scope, startAt: { gte: inactiveSince } },
                { status: { in: ["PENDING", "CONFIRMED"] }, ...scope, startAt: { gte: now } },
              ],
            },
          },
        },
      }),
      prisma.payment.findMany({
        where: {
          businessId,
          deletedAt: null,
          receivedAt: { gte: monthStart, lt: monthEnd },
          ...(scope.professionalId ? { appointment: { professionalId: scope.professionalId } } : {}),
        },
        select: { amountCents: true, commissionPercent: true },
      }),
      listReceivables(businessId, scope),
    ]);

  const dates = datesInRange(startDate, endDate);
  const available = professionals.reduce(
    (sum, professional) =>
      sum +
      availableMinutes(
        workingWindows(professional.workingHours, dates, timeZone),
        blocks.filter((block) => block.professionalId === professional.id),
      ),
    0,
  );
  const bookedMinutes = monthAppointments
    .filter((a) => a.status !== "CANCELLED")
    .reduce((sum, a) => sum + (a.endAt.getTime() - a.startAt.getTime()) / 60_000, 0);

  return {
    today,
    todayAppointments: todayAppointments.map((a) => ({
      id: a.id,
      startAt: a.startAt.toISOString(),
      endAt: a.endAt.toISOString(),
      status: a.status,
      isLate: isLate(a, now),
      clientName: a.client.name,
      serviceName: a.service.name,
      professionalName: a.professional.name,
    })),
    month: {
      appointments: monthAppointments.filter((a) => a.status !== "CANCELLED").length,
      noShowRate: computeNoShowRate(monthAppointments, now),
      occupancyRate: computeOccupancyRate(bookedMinutes, available),
      newClients: firstVisits.filter((v) => v._min.startAt && v._min.startAt >= monthStart && v._min.startAt < monthEnd)
        .length,
      receivedCents: received.reduce((sum, payment) => sum + payment.amountCents, 0),
      myCommissionCents: scope.professionalId ? received.reduce((sum, payment) => sum + commissionFor(payment), 0) : null,
    },
    receivable: totalReceivable(receivables),
    alerts: {
      professionalsWithoutHours: professionals
        .filter((p) => p.workingHours.length === 0)
        .map((p) => ({ id: p.id, name: p.name })),
      inactiveClients,
      completedWithoutPayment: totalReceivable(receivables.filter((r) => r.summary.status === "PENDING")),
      completedPartialPayment: totalReceivable(receivables.filter((r) => r.summary.status === "PARTIAL")),
      recentOnlineBookings: { count: recentOnlineCount, latest: recentOnline.map(toListItem) },
      pastWithoutOutcome: { count: pastOpenCount, latest: pastOpen.map(toListItem) },
    },
  };
}
