import type { Weekday } from "@/generated/prisma/enums";
import { prisma } from "@/server/db/prisma";
import { NotFoundError, ValidationError } from "@/server/errors";
import { describeHoursConflict, findHoursConflicts } from "@/server/modules/business/hours-rules";
import { canActivateAnotherProfessional, professionalLimitMessage } from "@/server/modules/business/plan-rules";
import { ownedServiceIds } from "@/server/modules/business/tenant-refs";

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
  specialty?: string | null;
  /** Chave de PROFESSIONAL_COLORS (src/lib/professional-colors.ts). */
  color?: string | null;
  /** Inativo: some da agenda, da página pública e do encaixe; histórico fica. */
  active?: boolean;
  /**
   * Comissão em % inteiro (0–100); null = sem comissão; undefined = não mexe.
   * Mudar a % não altera pagamentos já registrados (cada um congela a sua).
   */
  commissionPercent?: number | null;
  photoUrl?: string | null;
  photoUrls?: string[];
  serviceIds: string[];
  workingHours: WorkingHoursInput[];
}

function toPhotoCreateData(photoUrls: string[] | undefined) {
  return (photoUrls ?? [])
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url, position) => ({ url, position }));
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

/** O expediente precisa caber no horário de funcionamento do negócio (Configurações › Horário). */
async function assertWithinBusinessHours(businessId: string, workingHours: WorkingHoursInput[]): Promise<void> {
  const businessHours = await prisma.businessWorkingHours.findMany({
    where: { businessId },
    select: { weekday: true, startMinute: true, endMinute: true },
  });
  const conflicts = findHoursConflicts(businessHours, workingHours);
  if (conflicts.length > 0) {
    throw new ValidationError(
      `O expediente passa do horário de funcionamento. ${conflicts.map(describeHoursConflict).join("; ")}. Ajuste aqui ou em Configurações › Horário.`,
    );
  }
}

/**
 * Limite do plano (`Business.maxProfessionals`): recusa um profissional ATIVO a mais.
 * Sem limite (null, o padrão), não faz nada. `excludeId` = o profissional sendo reativado.
 */
async function assertPlanAllowsActiveProfessional(businessId: string, excludeId?: string): Promise<void> {
  const business = await prisma.business.findUnique({ where: { id: businessId }, select: { maxProfessionals: true } });
  const max = business?.maxProfessionals ?? null;
  if (max === null) return;
  const active = await prisma.professional.count({
    where: { businessId, active: true, deletedAt: null, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
  if (!canActivateAnotherProfessional(active, max)) throw new ValidationError(professionalLimitMessage(max), "PLAN_LIMIT");
}

export function listProfessionals(businessId: string) {
  return prisma.professional.findMany({
    where: { businessId, deletedAt: null },
    include: {
      workingHours: true,
      professionalServices: { include: { service: true } },
      photos: { orderBy: { position: "asc" } },
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
      photos: { orderBy: { position: "asc" } },
    },
  });
  if (!professional) throw new NotFoundError("Cadastro não encontrado");
  return professional;
}

export async function createProfessional(businessId: string, input: ProfessionalInput) {
  if (!input.name.trim()) throw new ValidationError("Nome é obrigatório");
  validateWorkingHours(input.workingHours);
  await assertWithinBusinessHours(businessId, input.workingHours);
  if (input.active ?? true) await assertPlanAllowsActiveProfessional(businessId);
  const serviceIds = await ownedServiceIds(businessId, input.serviceIds);

  return prisma.professional.create({
    data: {
      businessId,
      name: input.name.trim(),
      bio: input.bio ?? null,
      specialty: input.specialty ?? null,
      color: input.color ?? null,
      active: input.active ?? true,
      commissionPercent: input.commissionPercent ?? null,
      photoUrl: input.photoUrl ?? null,
      workingHours: { create: input.workingHours },
      professionalServices: {
        create: serviceIds.map((serviceId) => ({ serviceId })),
      },
      photos: { create: toPhotoCreateData(input.photoUrls) },
    },
    include: { workingHours: true, professionalServices: true, photos: true },
  });
}

export async function updateProfessional(
  businessId: string,
  id: string,
  input: ProfessionalInput,
) {
  if (!input.name.trim()) throw new ValidationError("Nome é obrigatório");
  validateWorkingHours(input.workingHours);
  await assertWithinBusinessHours(businessId, input.workingHours);

  const existing = await prisma.professional.findFirst({ where: { id, businessId, deletedAt: null } });
  if (!existing) throw new NotFoundError("Cadastro não encontrado");
  // Reativar alguém pausado conta no limite do plano; editar quem já está ativo, não.
  if (!existing.active && input.active === true) await assertPlanAllowsActiveProfessional(businessId, id);
  const serviceIds = await ownedServiceIds(businessId, input.serviceIds);

  return prisma.$transaction(async (tx) => {
    await tx.workingHours.deleteMany({ where: { professionalId: id } });
    await tx.professionalService.deleteMany({ where: { professionalId: id } });
    await tx.professionalPhoto.deleteMany({ where: { professionalId: id } });

    return tx.professional.update({
      where: { id },
      data: {
        name: input.name.trim(),
        bio: input.bio ?? null,
        specialty: input.specialty ?? null,
        color: input.color ?? null,
        active: input.active ?? existing.active,
        // Formulário sem o campo (preset sem comissões) preserva o valor atual.
        commissionPercent: input.commissionPercent === undefined ? existing.commissionPercent : input.commissionPercent,
        photoUrl: input.photoUrl ?? null,
        workingHours: { create: input.workingHours },
        professionalServices: {
          create: serviceIds.map((serviceId) => ({ serviceId })),
        },
        photos: { create: toPhotoCreateData(input.photoUrls) },
      },
      include: { workingHours: true, professionalServices: true, photos: true },
    });
  });
}

export async function deleteProfessional(businessId: string, id: string) {
  const existing = await prisma.professional.findFirst({ where: { id, businessId, deletedAt: null } });
  if (!existing) throw new NotFoundError("Cadastro não encontrado");

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
  if (!professional) throw new NotFoundError("Cadastro não encontrado");
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
