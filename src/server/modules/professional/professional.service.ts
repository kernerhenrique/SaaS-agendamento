import type { Weekday } from "@/generated/prisma/enums";
import { prisma } from "@/server/db/prisma";
import { NotFoundError, ValidationError } from "@/server/errors";

export interface WorkingHoursInput {
  weekday: Weekday;
  startMinute: number;
  endMinute: number;
  breakStartMinute?: number | null;
  breakEndMinute?: number | null;
}

export interface ProfessionalInput {
  name: string;
  bio?: string | null;
  photoUrl?: string | null;
  serviceIds: string[];
  workingHours: WorkingHoursInput[];
}

function validateWorkingHours(workingHours: WorkingHoursInput[]): void {
  const seenWeekdays = new Set<Weekday>();
  for (const wh of workingHours) {
    if (seenWeekdays.has(wh.weekday)) {
      throw new ValidationError(`Dia da semana duplicado no expediente: ${wh.weekday}`);
    }
    seenWeekdays.add(wh.weekday);

    if (wh.startMinute < 0 || wh.endMinute > 24 * 60 || wh.startMinute >= wh.endMinute) {
      throw new ValidationError(`Horário de expediente inválido em ${wh.weekday}`);
    }
    const hasBreakStart = wh.breakStartMinute != null;
    const hasBreakEnd = wh.breakEndMinute != null;
    if (hasBreakStart !== hasBreakEnd) {
      throw new ValidationError(`Intervalo de almoço incompleto em ${wh.weekday}`);
    }
    if (hasBreakStart && hasBreakEnd) {
      if (
        wh.breakStartMinute! < wh.startMinute ||
        wh.breakEndMinute! > wh.endMinute ||
        wh.breakStartMinute! >= wh.breakEndMinute!
      ) {
        throw new ValidationError(`Intervalo de almoço fora do expediente em ${wh.weekday}`);
      }
    }
  }
}

export function listProfessionals(businessId: string) {
  return prisma.professional.findMany({
    where: { businessId, deletedAt: null },
    include: {
      workingHours: true,
      professionalServices: { include: { service: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getProfessional(businessId: string, id: string) {
  const professional = await prisma.professional.findFirst({
    where: { id, businessId, deletedAt: null },
    include: {
      workingHours: true,
      professionalServices: { include: { service: true } },
      timeBlocks: { orderBy: { startAt: "asc" } },
    },
  });
  if (!professional) throw new NotFoundError("Profissional não encontrado");
  return professional;
}

export async function createProfessional(businessId: string, input: ProfessionalInput) {
  if (!input.name.trim()) throw new ValidationError("Nome é obrigatório");
  validateWorkingHours(input.workingHours);

  return prisma.professional.create({
    data: {
      businessId,
      name: input.name.trim(),
      bio: input.bio ?? null,
      photoUrl: input.photoUrl ?? null,
      workingHours: { create: input.workingHours },
      professionalServices: {
        create: input.serviceIds.map((serviceId) => ({ serviceId })),
      },
    },
    include: { workingHours: true, professionalServices: true },
  });
}

export async function updateProfessional(
  businessId: string,
  id: string,
  input: ProfessionalInput,
) {
  if (!input.name.trim()) throw new ValidationError("Nome é obrigatório");
  validateWorkingHours(input.workingHours);

  const existing = await prisma.professional.findFirst({ where: { id, businessId, deletedAt: null } });
  if (!existing) throw new NotFoundError("Profissional não encontrado");

  return prisma.$transaction(async (tx) => {
    await tx.workingHours.deleteMany({ where: { professionalId: id } });
    await tx.professionalService.deleteMany({ where: { professionalId: id } });

    return tx.professional.update({
      where: { id },
      data: {
        name: input.name.trim(),
        bio: input.bio ?? null,
        photoUrl: input.photoUrl ?? null,
        workingHours: { create: input.workingHours },
        professionalServices: {
          create: input.serviceIds.map((serviceId) => ({ serviceId })),
        },
      },
      include: { workingHours: true, professionalServices: true },
    });
  });
}

export async function deleteProfessional(businessId: string, id: string) {
  const existing = await prisma.professional.findFirst({ where: { id, businessId, deletedAt: null } });
  if (!existing) throw new NotFoundError("Profissional não encontrado");

  await prisma.professional.update({
    where: { id },
    data: { active: false, deletedAt: new Date() },
  });
}

export async function createTimeBlock(
  businessId: string,
  professionalId: string,
  input: { startAt: Date; endAt: Date; reason?: string | null },
) {
  const professional = await prisma.professional.findFirst({
    where: { id: professionalId, businessId, deletedAt: null },
  });
  if (!professional) throw new NotFoundError("Profissional não encontrado");
  if (input.startAt >= input.endAt) {
    throw new ValidationError("O fim do bloqueio deve ser depois do início");
  }

  return prisma.timeBlock.create({
    data: {
      professionalId,
      startAt: input.startAt,
      endAt: input.endAt,
      reason: input.reason ?? null,
    },
  });
}

export async function deleteTimeBlock(businessId: string, professionalId: string, timeBlockId: string) {
  const timeBlock = await prisma.timeBlock.findFirst({
    where: { id: timeBlockId, professionalId, professional: { businessId } },
  });
  if (!timeBlock) throw new NotFoundError("Bloqueio não encontrado");

  await prisma.timeBlock.delete({ where: { id: timeBlockId } });
}
