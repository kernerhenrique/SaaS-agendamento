import { AppointmentStatus, type Weekday } from "@/generated/prisma/enums";
import { localDayRangeUtc, localMinutesToUtc, rangesOverlap, utcToLocalDate, weekdayOfLocalDate } from "@/lib/date";
import { prisma } from "@/server/db/prisma";
import { NotFoundError, ValidationError } from "@/server/errors";

import { findClosureForDate } from "@/server/modules/business/closure.service";

import { bookingWindow } from "./booking-policy";

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
  /** Reagendamento: o próprio agendamento não conta como horário ocupado. */
  excludeAppointmentId?: string;
}

/**
 * Orquestra a busca no banco (negócio, serviço, profissionais aptos, agenda
 * já ocupada) e delega o cálculo em si para `computeSlotsForProfessional`.
 * Sem `professionalId`, considera todos os profissionais que realizam o
 * serviço ("sem preferência") e retorna um slot por profissional disponível.
 */
export async function getAvailableSlots(params: GetAvailableSlotsParams): Promise<Slot[]> {
  const { businessId, serviceId, professionalId, dateISO, excludeAppointmentId } = params;

  const business = await prisma.business.findFirst({
    where: { id: businessId, deletedAt: null },
  });
  if (!business) {
    throw new NotFoundError("Negócio não encontrado");
  }

  // Políticas de reserva: antecedência mínima vira o "agora" do cálculo e
  // datas além da janela máxima não têm horário.
  const { earliestStart, lastDate } = bookingWindow({
    now: new Date(),
    timeZone: business.timezone,
    minNoticeMinutes: business.minBookingNoticeMinutes,
    maxWindowDays: business.maxBookingWindowDays,
  });
  if (dateISO > lastDate) {
    return [];
  }
  // Negócio fechado no dia (feriado, férias): nenhum horário, para nenhum profissional.
  if (await findClosureForDate(businessId, dateISO)) {
    return [];
  }

  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId, active: true, deletedAt: null },
  });
  if (!service) {
    throw new NotFoundError("Cadastro não encontrado");
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
    throw new NotFoundError("Essa combinação de atendimento não está disponível");
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
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
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
        now: earliestStart,
      }),
    );
  }

  allSlots.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  return allSlots;
}

/** O início pedido é exatamente um dos horários oferecidos para esse profissional? */
export function isOfferedSlot(slots: Slot[], professionalId: string, startAt: Date): boolean {
  return slots.some((slot) => slot.professionalId === professionalId && slot.startAt.getTime() === startAt.getTime());
}

/** Código do erro: a tela da reserva volta aos horários do dia em vez de só mostrar o texto. */
export const SLOT_UNAVAILABLE_CODE = "SLOT_UNAVAILABLE";
export const SLOT_UNAVAILABLE_MESSAGE = "Esse horário não está mais disponível. Escolha outro.";

/**
 * Revalidação no servidor para quem agenda sem login (reserva pública e
 * reagendamento pelo link): o horário precisa ser um dos que a própria
 * disponibilidade ofereceria agora — expediente, intervalo, bloqueios,
 * passado e grade. A exclusion constraint segue como garantia final contra
 * duas reservas simultâneas.
 */
export async function assertSlotAvailable(params: {
  businessId: string;
  serviceId: string;
  professionalId: string;
  startAt: Date;
  excludeAppointmentId?: string;
}): Promise<void> {
  const business = await prisma.business.findFirst({
    where: { id: params.businessId, deletedAt: null },
    select: { timezone: true },
  });
  if (!business) throw new NotFoundError("Negócio não encontrado");

  const slots = await getAvailableSlots({
    businessId: params.businessId,
    serviceId: params.serviceId,
    professionalId: params.professionalId,
    dateISO: utcToLocalDate(params.startAt, business.timezone),
    excludeAppointmentId: params.excludeAppointmentId,
  });
  if (!isOfferedSlot(slots, params.professionalId, params.startAt)) {
    throw new ValidationError(SLOT_UNAVAILABLE_MESSAGE, SLOT_UNAVAILABLE_CODE);
  }
}
