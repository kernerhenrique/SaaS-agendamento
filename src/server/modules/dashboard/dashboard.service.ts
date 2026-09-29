import type { AppointmentStatus } from "@/generated/prisma/enums";
import { localDayRangeUtc, todayInTimeZone } from "@/lib/date";
import { prisma } from "@/server/db/prisma";
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
  };
}

const totalReceivable = (rows: { summary: { balanceCents: number } }[]) => ({
  count: rows.length,
  cents: rows.reduce((sum, row) => sum + row.summary.balanceCents, 0),
});

export async function getDashboard(businessId: string, timeZone: string, now = new Date()): Promise<DashboardData> {
  const today = todayInTimeZone(timeZone);
  const todayRange = localDayRangeUtc(today, timeZone);
  const { startDate, endDate } = monthRange(today);
  const monthStart = localDayRangeUtc(startDate, timeZone).start;
  const monthEnd = localDayRangeUtc(endDate, timeZone).end;
  const inactiveSince = new Date(now.getTime() - INACTIVE_CLIENT_DAYS * 24 * 60 * 60 * 1000);

  const [todayAppointments, monthAppointments, professionals, blocks, firstVisits, inactiveClients, received, receivables] =
    await Promise.all([
      prisma.appointment.findMany({
        where: { businessId, status: { not: "CANCELLED" }, startAt: { gte: todayRange.start, lt: todayRange.end } },
        include: { client: true, service: true, professional: true },
        orderBy: { startAt: "asc" },
      }),
      prisma.appointment.findMany({
        where: { businessId, startAt: { gte: monthStart, lt: monthEnd } },
        select: { status: true, startAt: true, endAt: true },
      }),
      prisma.professional.findMany({
        where: { businessId, active: true, deletedAt: null },
        select: { id: true, name: true, workingHours: true },
        orderBy: { name: "asc" },
      }),
      prisma.timeBlock.findMany({
        where: { professional: { businessId, active: true, deletedAt: null }, startAt: { lt: monthEnd }, endAt: { gt: monthStart } },
        select: { professionalId: true, startAt: true, endAt: true },
      }),
      // Primeira visita de cada cliente: é "novo" no mês se ela cai no mês.
      prisma.appointment.groupBy({
        by: ["clientId"],
        where: { businessId, status: { not: "CANCELLED" } },
        _min: { startAt: true },
      }),
      // Sem atendimento concluído nos últimos N dias e sem nada marcado para frente.
      prisma.client.count({
        where: {
          businessId,
          appointments: {
            some: { status: "COMPLETED" },
            none: {
              OR: [
                { status: "COMPLETED", startAt: { gte: inactiveSince } },
                { status: { in: ["PENDING", "CONFIRMED"] }, startAt: { gte: now } },
              ],
            },
          },
        },
      }),
      prisma.payment.aggregate({
        where: { businessId, deletedAt: null, receivedAt: { gte: monthStart, lt: monthEnd } },
        _sum: { amountCents: true },
      }),
      listReceivables(businessId),
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
      receivedCents: received._sum.amountCents ?? 0,
    },
    receivable: totalReceivable(receivables),
    alerts: {
      professionalsWithoutHours: professionals
        .filter((p) => p.workingHours.length === 0)
        .map((p) => ({ id: p.id, name: p.name })),
      inactiveClients,
      completedWithoutPayment: totalReceivable(receivables.filter((r) => r.summary.status === "PENDING")),
      completedPartialPayment: totalReceivable(receivables.filter((r) => r.summary.status === "PARTIAL")),
    },
  };
}
