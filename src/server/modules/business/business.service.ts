import { prisma } from "@/server/db/prisma";
import { NotFoundError } from "@/server/errors";

import type { BookingPoliciesInput, BrandingInput, BusinessHoursInput, BusinessProfileInput } from "./business-rules";

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
export const updateBranding = (businessId: string, input: BrandingInput) => updateSettings(businessId, input);
export const updateBookingPolicies = (businessId: string, input: BookingPoliciesInput) => updateSettings(businessId, input);

/** Substitui a semana inteira: dias fora da lista ficam como fechados. */
export async function replaceBusinessHours(businessId: string, hours: BusinessHoursInput[]): Promise<BusinessSettings> {
  await getBusinessSettings(businessId);
  await prisma.$transaction([
    prisma.businessWorkingHours.deleteMany({ where: { businessId } }),
    prisma.businessWorkingHours.createMany({ data: hours.map((entry) => ({ ...entry, businessId })) }),
  ]);
  return getBusinessSettings(businessId);
}
