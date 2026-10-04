import { prisma } from "@/server/db/prisma";
import { NotFoundError, ValidationError } from "@/server/errors";

import type { BookingPoliciesInput, BrandingInput, BusinessHoursInput, BusinessProfileInput } from "./business-rules";
import { deleteOwnBlobs } from "./business-images";
import { describeHoursConflict, findHoursConflicts } from "./hours-rules";

/**
 * Configurações do negócio. O `businessId` vem sempre da sessão. Slug e fuso
 * são só leitura de propósito: trocar o slug quebra links já compartilhados e
 * trocar o fuso deslocaria toda a agenda gravada.
 */
const SETTINGS_SELECT = {
  id: true,
  name: true,
  slug: true,
  timezone: true,
  address: true,
  whatsapp: true,
  instagramUrl: true,
  businessType: true,
  logoUrl: true,
  coverUrl: true,
  accentColor: true,
  policyText: true,
  minBookingNoticeMinutes: true,
  maxBookingWindowDays: true,
  cancellationDeadlineHours: true,
  workingHours: {
    select: { weekday: true, startMinute: true, endMinute: true },
  },
} as const;

export async function getBusinessSettings(businessId: string) {
  const business = await prisma.business.findFirst({
    where: { id: businessId, deletedAt: null },
    select: SETTINGS_SELECT,
  });
  if (!business) throw new NotFoundError("Negócio não encontrado");
  return business;
}

export type BusinessSettings = Awaited<ReturnType<typeof getBusinessSettings>>;

async function updateSettings(
  businessId: string,
  data: BusinessProfileInput | BrandingInput | BookingPoliciesInput,
): Promise<BusinessSettings> {
  await getBusinessSettings(businessId);
  return prisma.business.update({ where: { id: businessId }, data, select: SETTINGS_SELECT });
}

export const updateBusinessProfile = (businessId: string, input: BusinessProfileInput) => updateSettings(businessId, input);
/** Logo/capa trocadas ou removidas: a imagem antiga sai do Blob (se era nossa). */
export async function updateBranding(businessId: string, input: BrandingInput): Promise<BusinessSettings> {
  const before = await getBusinessSettings(businessId);
  const saved = await updateSettings(businessId, input);
  await deleteOwnBlobs([
    before.logoUrl !== saved.logoUrl ? before.logoUrl : null,
    before.coverUrl !== saved.coverUrl ? before.coverUrl : null,
  ]);
  return saved;
}
export const updateBookingPolicies = (businessId: string, input: BookingPoliciesInput) => updateSettings(businessId, input);

/** Substitui a semana inteira: dias fora da lista ficam como fechados. */
export async function replaceBusinessHours(businessId: string, hours: BusinessHoursInput[]): Promise<BusinessSettings> {
  await getBusinessSettings(businessId);
  // Ninguém da equipe pode ficar com expediente fora do novo horário.
  const team = await prisma.professional.findMany({
    where: { businessId, active: true, deletedAt: null },
    select: { name: true, workingHours: { select: { weekday: true, startMinute: true, endMinute: true } } },
    orderBy: { name: "asc" },
  });
  const outside = team
    .map((professional) => ({ name: professional.name, conflicts: findHoursConflicts(hours, professional.workingHours) }))
    .filter((entry) => entry.conflicts.length > 0);
  if (outside.length > 0) {
    throw new ValidationError(
      `O expediente da equipe ficaria fora do horário: ${outside
        .map((entry) => `${entry.name} (${entry.conflicts.map(describeHoursConflict).join("; ")})`)
        .join(" · ")}. Ajuste o expediente no cadastro de cada um antes, ou amplie o horário.`,
    );
  }
  await prisma.$transaction([
    prisma.businessWorkingHours.deleteMany({ where: { businessId } }),
    prisma.businessWorkingHours.createMany({ data: hours.map((entry) => ({ ...entry, businessId })) }),
  ]);
  return getBusinessSettings(businessId);
}
