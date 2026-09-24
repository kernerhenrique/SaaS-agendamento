import { AppointmentStatus } from "@/generated/prisma/enums";
import { prisma } from "@/server/db/prisma";

export interface ReportSummary {
  total: number;
  byStatus: Record<AppointmentStatus, number>;
  cancellationRate: number;
  noShowRate: number;
  mostRequestedProfessional: { professionalId: string; name: string; count: number } | null;
}

export async function getReportSummary(
  businessId: string,
  range: { startAt: Date; endAt: Date },
): Promise<ReportSummary> {
  const appointments = await prisma.appointment.findMany({
    where: { businessId, startAt: { gte: range.startAt, lt: range.endAt } },
    select: { status: true, professionalId: true },
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

  const total = appointments.length;

  let mostRequestedProfessional: ReportSummary["mostRequestedProfessional"] = null;
  let topCount = 0;
  for (const [professionalId, count] of countByProfessional) {
    if (count > topCount) {
      topCount = count;
      mostRequestedProfessional = { professionalId, name: "", count };
    }
  }
  if (mostRequestedProfessional) {
    const professional = await prisma.professional.findUnique({
      where: { id: mostRequestedProfessional.professionalId },
      select: { name: true },
    });
    mostRequestedProfessional.name = professional?.name ?? "(profissional removido)";
  }

  return {
    total,
    byStatus,
    cancellationRate: total === 0 ? 0 : byStatus.CANCELLED / total,
    noShowRate: total === 0 ? 0 : byStatus.NO_SHOW / total,
    mostRequestedProfessional,
  };
}
