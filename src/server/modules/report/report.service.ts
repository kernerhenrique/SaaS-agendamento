import { AppointmentStatus } from "@/generated/prisma/enums";
import { addDaysToIsoDate, localDayRangeUtc, utcToLocalDate } from "@/lib/date";
import { prisma } from "@/server/db/prisma";
import { ValidationError } from "@/server/errors";

const MAX_RANGE_DAYS = 366;

export interface ReportSummary {
  total: number;
  byStatus: Record<AppointmentStatus, number>;
  cancellationRate: number;
  noShowRate: number;
  mostRequestedProfessional: { professionalId: string; name: string; count: number } | null;
  /** Um item por dia do período (inclusive dias sem agendamento), em ordem. */
  byDay: { date: string; count: number }[];
  /** Profissionais com agendamento no período, do mais para o menos requisitado. */
  byProfessional: { professionalId: string; name: string; count: number }[];
}

/**
 * Conta instantes por data de calendário local, preenchendo com zero os dias
 * sem nenhum registro — um gráfico de tendência sem os "buracos" mentiria
 * sobre o intervalo entre as colunas.
 */
export function countByLocalDay(
  instants: Date[],
  startDate: string,
  endDate: string,
  timeZone: string,
): { date: string; count: number }[] {
  const counts = new Map<string, number>();
  for (let date = startDate; date <= endDate; date = addDaysToIsoDate(date, 1)) {
    counts.set(date, 0);
  }
  for (const instant of instants) {
    const date = utcToLocalDate(instant, timeZone);
    if (counts.has(date)) counts.set(date, counts.get(date)! + 1);
  }
  return [...counts].map(([date, count]) => ({ date, count }));
}

function daysBetween(startDate: string, endDate: string): number {
  return (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86_400_000;
}

export async function getReportSummary(
  businessId: string,
  period: { startDate: string; endDate: string; timeZone: string },
): Promise<ReportSummary> {
  const { startDate, endDate, timeZone } = period;
  const span = daysBetween(startDate, endDate);
  if (span < 0) {
    throw new ValidationError("A data inicial deve ser anterior à data final");
  }
  if (span >= MAX_RANGE_DAYS) {
    throw new ValidationError(`O período máximo é de ${MAX_RANGE_DAYS} dias`);
  }

  const { start: startAt } = localDayRangeUtc(startDate, timeZone);
  const { end: endAt } = localDayRangeUtc(endDate, timeZone);

  const appointments = await prisma.appointment.findMany({
    where: { businessId, startAt: { gte: startAt, lt: endAt } },
    select: { status: true, professionalId: true, startAt: true },
  });

  const byStatus: Record<AppointmentStatus, number> = {
    PENDING: 0,
    CONFIRMED: 0,
    CANCELLED: 0,
    COMPLETED: 0,
    NO_SHOW: 0,
  };
  const countByProfessional = new Map<string, number>();

  for (const appointment of appointments) {
    byStatus[appointment.status] += 1;
    countByProfessional.set(
      appointment.professionalId,
      (countByProfessional.get(appointment.professionalId) ?? 0) + 1,
    );
  }

  // Inclui profissionais já removidos: o histórico continua valendo.
  const professionals = await prisma.professional.findMany({
    where: { id: { in: [...countByProfessional.keys()] }, businessId },
    select: { id: true, name: true },
  });
  const nameById = new Map(professionals.map((p) => [p.id, p.name]));

  const byProfessional = [...countByProfessional]
    .map(([professionalId, count]) => ({
      professionalId,
      name: nameById.get(professionalId) ?? "(profissional removido)",
      count,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const total = appointments.length;

  return {
    total,
    byStatus,
    cancellationRate: total === 0 ? 0 : byStatus.CANCELLED / total,
    noShowRate: total === 0 ? 0 : byStatus.NO_SHOW / total,
    mostRequestedProfessional: byProfessional[0] ?? null,
    byDay: countByLocalDay(
      appointments.map((a) => a.startAt),
      startDate,
      endDate,
      timeZone,
    ),
    byProfessional,
  };
}
