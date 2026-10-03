import { localDayRangeUtc, addDaysToIsoDate, todayInTimeZone } from "@/lib/date";
import { prisma } from "@/server/db/prisma";
import { NotFoundError } from "@/server/errors";

import { findClosure, type ClosureRange } from "./closure-rules";

/**
 * Dias fechados do negócio. Sempre com o `businessId` da sessão (painel) ou do
 * negócio da página pública. Fechar não cancela nada: devolve os agendamentos
 * que já existem no período para o dono remarcar.
 */

export interface ClosureDto extends ClosureRange {
  id: string;
}

export interface AffectedAppointment {
  id: string;
  startAt: string;
  clientName: string;
  professionalName: string;
}

/** Fechamentos que ainda não terminaram (hoje em diante), em ordem. */
export async function listUpcomingClosures(businessId: string, timeZone: string): Promise<ClosureDto[]> {
  const closures = await prisma.businessClosure.findMany({
    where: { businessId, endDate: { gte: todayInTimeZone(timeZone) } },
    orderBy: { startDate: "asc" },
    select: { id: true, startDate: true, endDate: true, reason: true },
  });
  return closures;
}

/** O fechamento que cobre a data (para a disponibilidade e o encaixe), ou null. */
export async function findClosureForDate(businessId: string, dateISO: string): Promise<ClosureRange | null> {
  const candidates = await prisma.businessClosure.findMany({
    where: { businessId, startDate: { lte: dateISO }, endDate: { gte: dateISO } },
    select: { startDate: true, endDate: true, reason: true },
    take: 1,
  });
  return findClosure(dateISO, candidates);
}

/** Agendamentos ativos dentro dos períodos (para avisar o dono ao fechar). */
async function appointmentsWithin(businessId: string, timeZone: string, ranges: ClosureRange[]): Promise<AffectedAppointment[]> {
  if (ranges.length === 0) return [];
  const appointments = await prisma.appointment.findMany({
    where: {
      businessId,
      status: { in: ["PENDING", "CONFIRMED"] },
      OR: ranges.map((range) => ({
        startAt: {
          gte: localDayRangeUtc(range.startDate, timeZone).start,
          lt: localDayRangeUtc(addDaysToIsoDate(range.endDate, 1), timeZone).start,
        },
      })),
    },
    include: { client: { select: { name: true } }, professional: { select: { name: true } } },
    orderBy: { startAt: "asc" },
  });
  return appointments.map((a) => ({ id: a.id, startAt: a.startAt.toISOString(), clientName: a.client.name, professionalName: a.professional.name }));
}

/**
 * Cria um ou mais fechamentos (o botão de feriados manda vários). Pula o que
 * já existe igual (mesmo período), para clicar duas vezes não duplicar.
 */
export async function createClosures(
  businessId: string,
  timeZone: string,
  ranges: ClosureRange[],
): Promise<{ created: ClosureDto[]; affected: AffectedAppointment[] }> {
  const existing = await prisma.businessClosure.findMany({ where: { businessId }, select: { startDate: true, endDate: true } });
  const fresh = ranges.filter((range) => !existing.some((e) => e.startDate === range.startDate && e.endDate === range.endDate));
  const created = await prisma.$transaction(
    fresh.map((range) => prisma.businessClosure.create({ data: { businessId, ...range }, select: { id: true, startDate: true, endDate: true, reason: true } })),
  );
  return { created, affected: await appointmentsWithin(businessId, timeZone, fresh) };
}

export async function deleteClosure(businessId: string, closureId: string): Promise<void> {
  const { count } = await prisma.businessClosure.deleteMany({ where: { id: closureId, businessId } });
  if (count === 0) throw new NotFoundError("Dia fechado não encontrado");
}
