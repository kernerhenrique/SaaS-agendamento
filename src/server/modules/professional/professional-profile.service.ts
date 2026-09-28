import { localDayRangeUtc, todayInTimeZone } from "@/lib/date";
import { prisma } from "@/server/db/prisma";
import {
  availableMinutes,
  computeNoShowRate,
  computeOccupancyRate,
  datesInRange,
  monthRange,
  workingWindows,
} from "@/server/modules/dashboard/metrics";

import { commissionFor } from "@/server/modules/payment/payment-rules";

import { getProfessional } from "./professional.service";

const UPCOMING_LIMIT = 30;

/**
 * Perfil do profissional (/admin/profissionais/[id]): cadastro, próximos
 * atendimentos e desempenho do mês corrente, com as mesmas métricas do Início
 * aplicadas a uma pessoa só.
 */
export async function getProfessionalProfile(businessId: string, professionalId: string, timeZone: string, now = new Date()) {
  const professional = await getProfessional(businessId, professionalId);

  const today = todayInTimeZone(timeZone);
  const { startDate, endDate } = monthRange(today);
  const monthStart = localDayRangeUtc(startDate, timeZone).start;
  const monthEnd = localDayRangeUtc(endDate, timeZone).end;

  const [upcoming, monthAppointments, monthPayments] = await Promise.all([
    prisma.appointment.findMany({
      where: { businessId, professionalId, status: { in: ["PENDING", "CONFIRMED"] }, startAt: { gte: now } },
      select: {
        id: true,
        status: true,
        startAt: true,
        endAt: true,
        client: { select: { name: true } },
        service: { select: { name: true } },
      },
      orderBy: { startAt: "asc" },
      take: UPCOMING_LIMIT,
    }),
    prisma.appointment.findMany({
      where: { businessId, professionalId, startAt: { gte: monthStart, lt: monthEnd } },
      select: { status: true, startAt: true, endAt: true },
    }),
    // Financeiro do mês pela data de recebimento (mesma regra da tela Financeiro).
    prisma.payment.findMany({
      where: { businessId, deletedAt: null, receivedAt: { gte: monthStart, lt: monthEnd }, appointment: { professionalId } },
      select: { amountCents: true, commissionPercent: true },
    }),
  ]);

  const notCancelled = monthAppointments.filter((a) => a.status !== "CANCELLED");
  const bookedMinutes = notCancelled.reduce((sum, a) => sum + (a.endAt.getTime() - a.startAt.getTime()) / 60_000, 0);
  const available = availableMinutes(
    workingWindows(professional.workingHours, datesInRange(startDate, endDate), timeZone),
    professional.timeBlocks.filter((block) => block.startAt < monthEnd && block.endAt > monthStart),
  );

  return {
    professional,
    upcoming,
    month: {
      startDate,
      appointments: notCancelled.length,
      completed: monthAppointments.filter((a) => a.status === "COMPLETED").length,
      noShows: monthAppointments.filter((a) => a.status === "NO_SHOW").length,
      noShowRate: computeNoShowRate(monthAppointments, now),
      occupancyRate: computeOccupancyRate(bookedMinutes, available),
      receivedCents: monthPayments.reduce((sum, p) => sum + p.amountCents, 0),
      commissionCents: monthPayments.reduce((sum, p) => sum + commissionFor(p), 0),
    },
  };
}
