import { AppointmentStatus } from "@/generated/prisma/enums";
import { utcToLocalDate, utcToLocalMinutes } from "@/lib/date";
import { prisma } from "@/server/db/prisma";
import { NotFoundError, ValidationError } from "@/server/errors";

import { isOverlapConstraintViolation, MANAGE_TOKEN_TTL_DAYS_AFTER_APPOINTMENT } from "./appointment.service";
import { buildSeriesDates, planOccurrences, type OccurrenceContext, type PlannedOccurrence } from "./series-rules";

/**
 * Agendamento recorrente pelo painel. A série parte sempre de um agendamento
 * existente (o que o cliente marcou, ou o recém-criado no "Novo agendamento"):
 * ele é a 1ª data; as próximas são agendamentos normais, ligados por `seriesId`.
 * Partindo da última data de uma série, as novas datas entram na mesma série ("Renovar").
 * As próximas datas nascem AGENDADO: o lembrete de cada semana pede a confirmação.
 */

const ACTIVE: AppointmentStatus[] = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED];

async function loadBase(businessId: string, appointmentId: string) {
  const base = await prisma.appointment.findFirst({
    where: { id: appointmentId, businessId },
    include: { business: { select: { timezone: true } }, service: { select: { durationMin: true, priceCents: true } }, series: true },
  });
  if (!base) throw new NotFoundError("Agendamento não encontrado");
  if (!ACTIVE.includes(base.status)) throw new ValidationError("Só dá para repetir um agendamento agendado ou confirmado");
  return base;
}

async function occurrenceContext(base: Awaited<ReturnType<typeof loadBase>>, until: Date): Promise<OccurrenceContext> {
  const [weeklyHours, closures, blocks, busy] = await Promise.all([
    prisma.workingHours.findMany({ where: { professionalId: base.professionalId } }),
    prisma.businessClosure.findMany({ where: { businessId: base.businessId }, select: { startDate: true, endDate: true, reason: true } }),
    prisma.timeBlock.findMany({ where: { professionalId: base.professionalId, startAt: { lt: until }, endAt: { gt: base.startAt } }, select: { startAt: true, endAt: true } }),
    prisma.appointment.findMany({
      where: { professionalId: base.professionalId, status: { not: AppointmentStatus.CANCELLED }, startAt: { lt: until }, endAt: { gt: base.endAt }, id: { not: base.id } },
      select: { startAt: true, endAt: true },
    }),
  ]);
  return { now: new Date(), timeZone: base.business.timezone, weeklyHours, closures, blocks, busy };
}

/** Datas novas (a 1ª, o próprio agendamento, fica de fora) com o problema de cada uma. */
export async function previewSeries(
  businessId: string,
  appointmentId: string,
  options: { frequencyWeeks: number; count: number },
): Promise<{ frequencyWeeks: number; occurrences: PlannedOccurrence[] }> {
  const base = await loadBase(businessId, appointmentId);
  // Renovar: a série já tem frequência; parte da última data dela.
  if (base.seriesId) {
    const later = await prisma.appointment.count({ where: { seriesId: base.seriesId, startAt: { gt: base.startAt } } });
    if (later > 0) throw new ValidationError("Para renovar, abra a última data da série");
  }
  const frequencyWeeks = base.series?.frequencyWeeks ?? options.frequencyWeeks;
  const timeZone = base.business.timezone;
  const dates = buildSeriesDates(utcToLocalDate(base.startAt, timeZone), frequencyWeeks, options.count).slice(1);
  const durationMin = Math.round((base.endAt.getTime() - base.startAt.getTime()) / 60_000);
  const lastEnd = new Date(base.endAt.getTime() + (options.count + 1) * 7 * frequencyWeeks * 86_400_000);
  const context = await occurrenceContext(base, lastEnd);
  return { frequencyWeeks, occurrences: planOccurrences({ dates, startMinute: utcToLocalMinutes(base.startAt, timeZone), durationMin, context }) };
}

/** Cria a série (ou acrescenta à existente) só com as datas livres. Uma data que ficou ocupada no meio do caminho é pulada. */
export async function createSeries(
  businessId: string,
  appointmentId: string,
  options: { frequencyWeeks: number; count: number },
  actorUserId: string,
): Promise<{ seriesId: string; created: string[]; skipped: { date: string; problem: string }[] }> {
  const base = await loadBase(businessId, appointmentId);
  const { frequencyWeeks, occurrences } = await previewSeries(businessId, appointmentId, options);
  const seriesId =
    base.seriesId ??
    (await prisma.$transaction(async (tx) => {
      const series = await tx.appointmentSeries.create({ data: { businessId, frequencyWeeks, createdByUserId: actorUserId } });
      await tx.appointment.update({ where: { id: base.id }, data: { seriesId: series.id } });
      return series.id;
    }));

  const created: string[] = [];
  const skipped: { date: string; problem: string }[] = [];
  for (const occurrence of occurrences) {
    if (occurrence.problem) {
      skipped.push({ date: occurrence.date, problem: occurrence.problem });
      continue;
    }
    try {
      await prisma.appointment.create({
        data: {
          businessId,
          professionalId: base.professionalId,
          serviceId: base.serviceId,
          clientId: base.clientId,
          startAt: occurrence.startAt,
          endAt: occurrence.endAt,
          status: AppointmentStatus.PENDING,
          priceCents: base.service.priceCents,
          notes: base.notes,
          seriesId,
          createdByUserId: actorUserId,
          manageTokenExpiresAt: new Date(occurrence.endAt.getTime() + MANAGE_TOKEN_TTL_DAYS_AFTER_APPOINTMENT * 86_400_000),
        },
      });
      created.push(occurrence.date);
    } catch (error) {
      if (!isOverlapConstraintViolation(error)) throw error;
      skipped.push({ date: occurrence.date, problem: "Horário ocupado" });
    }
  }
  return { seriesId, created, skipped };
}

export interface SeriesSummary {
  seriesId: string;
  frequencyWeeks: number;
  /** Datas ativas daqui para frente (incluindo a de hoje), em ordem. */
  upcoming: { id: string; startAt: string; status: AppointmentStatus }[];
  lastStartAt: string | null;
  /** Esta é a última data da série (é dela que se renova)? */
  isLast: boolean;
}

export async function getSeriesSummary(seriesId: string, currentAppointmentId: string): Promise<SeriesSummary | null> {
  const series = await prisma.appointmentSeries.findUnique({
    where: { id: seriesId },
    include: { appointments: { orderBy: { startAt: "asc" }, select: { id: true, startAt: true, endAt: true, status: true } } },
  });
  if (!series) return null;
  const now = Date.now();
  const nonCancelled = series.appointments.filter((a) => a.status !== AppointmentStatus.CANCELLED);
  const last = nonCancelled.at(-1) ?? null;
  return {
    seriesId: series.id,
    frequencyWeeks: series.frequencyWeeks,
    upcoming: series.appointments
      .filter((a) => ACTIVE.includes(a.status) && a.endAt.getTime() > now)
      .map((a) => ({ id: a.id, startAt: a.startAt.toISOString(), status: a.status })),
    lastStartAt: last?.startAt.toISOString() ?? null,
    isLast: last?.id === currentAppointmentId,
  };
}

/** Painel: cancela esta data ou esta e as próximas (só as ainda ativas). */
export async function cancelSeriesFrom(
  businessId: string,
  appointmentId: string,
  scope: "this" | "following",
  actorUserId: string,
): Promise<number> {
  const appointment = await prisma.appointment.findFirst({ where: { id: appointmentId, businessId }, select: { id: true, seriesId: true, startAt: true } });
  if (!appointment) throw new NotFoundError("Agendamento não encontrado");
  const where =
    scope === "following" && appointment.seriesId
      ? { seriesId: appointment.seriesId, startAt: { gte: appointment.startAt } }
      : { id: appointment.id };
  const { count } = await prisma.appointment.updateMany({
    where: { ...where, businessId, status: { in: ACTIVE } },
    data: { status: AppointmentStatus.CANCELLED, cancelledByUserId: actorUserId },
  });
  return count;
}
