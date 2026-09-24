import { AppointmentStatus, type Weekday } from "@/generated/prisma/enums";
import { localDayRangeUtc, localMinutesToUtc, rangesOverlap, weekdayOfLocalDate } from "@/lib/date";
import { prisma } from "@/server/db/prisma";
import { NotFoundError, ValidationError } from "@/server/errors";

export const DEFAULT_SLOT_GRANULARITY_MINUTES = 15;

export interface WorkingHoursWindow {
  weekday: Weekday;
  startMinute: number;
  endMinute: number;
  breakStartMinute: number | null;
  breakEndMinute: number | null;
}

export interface BusyInterval {
  start: Date;
  end: Date;
}

export interface Slot {
  professionalId: string;
  startAt: Date;
  endAt: Date;
}

/**
 * Gera os horários livres de um único profissional em um único dia. Função pura
 * (sem acesso a banco) para poder ser testada exaustivamente: overlap, timezone/
 * horário de verão, duração variável, intervalo de almoço, bloqueios manuais.
 */
export function computeSlotsForProfessional(params: {
  professionalId: string;
  dateISO: string;
  timeZone: string;
  workingHours: WorkingHoursWindow | null;
  busyIntervals: BusyInterval[];
  durationMin: number;
  now?: Date;
  granularityMinutes?: number;
}): Slot[] {
  const {
    professionalId,
    dateISO,
    timeZone,
    workingHours,
    busyIntervals,
    durationMin,
    now = new Date(),
    granularityMinutes = DEFAULT_SLOT_GRANULARITY_MINUTES,
  } = params;

  if (durationMin <= 0) {
    throw new ValidationError("durationMin deve ser maior que zero");
  }
  if (!workingHours) {
    return [];
  }

  const slots: Slot[] = [];
  const lastPossibleStartMinute = workingHours.endMinute - durationMin;

  for (
    let startMinute = workingHours.startMinute;
    startMinute <= lastPossibleStartMinute;
    startMinute += granularityMinutes
  ) {
    const endMinute = startMinute + durationMin;

    const overlapsBreak =
      workingHours.breakStartMinute != null &&
      workingHours.breakEndMinute != null &&
      startMinute < workingHours.breakEndMinute &&
      workingHours.breakStartMinute < endMinute;
    if (overlapsBreak) continue;

    const startAt = localMinutesToUtc(dateISO, startMinute, timeZone);
    const endAt = localMinutesToUtc(dateISO, endMinute, timeZone);

    if (startAt < now) continue;

    const overlapsBusy = busyIntervals.some((busy) =>
      rangesOverlap(startAt, endAt, busy.start, busy.end),
    );
    if (overlapsBusy) continue;

    slots.push({ professionalId, startAt, endAt });
  }

  return slots;
}

export interface GetAvailableSlotsParams {
  businessId: string;
  serviceId: string;
  professionalId?: string;
  dateISO: string;
}

/**
 * Orquestra a busca no banco (negócio, serviço, profissionais aptos, agenda
 * já ocupada) e delega o cálculo em si para `computeSlotsForProfessional`.
 * Sem `professionalId`, considera todos os profissionais que realizam o
 * serviço ("sem preferência") e retorna um slot por profissional disponível.
 */
export async function getAvailableSlots(params: GetAvailableSlotsParams): Promise<Slot[]> {
  const { businessId, serviceId, professionalId, dateISO } = params;

  const business = await prisma.business.findFirst({
    where: { id: businessId, deletedAt: null },
  });
  if (!business) {
    throw new NotFoundError("Negócio não encontrado");
  }

  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId, active: true, deletedAt: null },
  });
  if (!service) {
    throw new NotFoundError("Serviço não encontrado");
  }

  const professionals = await prisma.professional.findMany({
    where: {
      businessId,
      active: true,
      deletedAt: null,
      ...(professionalId ? { id: professionalId } : {}),
      professionalServices: { some: { serviceId } },
    },
    include: { workingHours: true },
  });

  if (professionalId && professionals.length === 0) {
    throw new NotFoundError("Profissional não encontrado ou não realiza este serviço");
  }

  const weekday = weekdayOfLocalDate(dateISO);
  const { start: dayStart, end: dayEnd } = localDayRangeUtc(dateISO, business.timezone);
  const professionalIds = professionals.map((professional) => professional.id);

  const [timeBlocks, appointments] = await Promise.all([
    prisma.timeBlock.findMany({
      where: {
        professionalId: { in: professionalIds },
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
      },
    }),
    prisma.appointment.findMany({
      where: {
        professionalId: { in: professionalIds },
        status: { not: AppointmentStatus.CANCELLED },
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
      },
    }),
  ]);

  const busyByProfessional = new Map<string, BusyInterval[]>();
  for (const timeBlock of timeBlocks) {
    const list = busyByProfessional.get(timeBlock.professionalId) ?? [];
    list.push({ start: timeBlock.startAt, end: timeBlock.endAt });
    busyByProfessional.set(timeBlock.professionalId, list);
  }
  for (const appointment of appointments) {
    const list = busyByProfessional.get(appointment.professionalId) ?? [];
    list.push({ start: appointment.startAt, end: appointment.endAt });
    busyByProfessional.set(appointment.professionalId, list);
  }

  const now = new Date();
  const allSlots: Slot[] = [];

  for (const professional of professionals) {
    const workingHoursForDay =
      professional.workingHours.find((workingHours) => workingHours.weekday === weekday) ?? null;

    allSlots.push(
      ...computeSlotsForProfessional({
        professionalId: professional.id,
        dateISO,
        timeZone: business.timezone,
        workingHours: workingHoursForDay,
        busyIntervals: busyByProfessional.get(professional.id) ?? [],
        durationMin: service.durationMin,
        now,
      }),
    );
  }

  allSlots.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  return allSlots;
}
