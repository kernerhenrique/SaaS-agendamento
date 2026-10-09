import { getAppBaseUrl } from "@/server/app-url";
import { prisma } from "@/server/db/prisma";
import { ValidationError } from "@/server/errors";
import { createOwnerInvite } from "@/server/modules/staff/staff.service";

import type { NewClientInput } from "./client-file";

/**
 * Cria um cliente novo a partir do arquivo já validado (`parseClientFile`):
 * negócio, horário, políticas, catálogo, equipe com expediente e o link de
 * primeiro acesso do dono. Tudo numa transação (nada fica pela metade); o
 * convite sai depois, já com o negócio gravado.
 */
export async function createClientBusiness(
  input: NewClientInput,
  images: { logoUrl: string | null; coverUrl: string | null },
): Promise<{ businessId: string; publicUrl: string; ownerInvite: { url: string; expiresAt: string } }> {
  const businessId = await insertClientBusiness(input, images);
  const ownerInvite = await createOwnerInvite(businessId);
  return { businessId, publicUrl: `${getAppBaseUrl()}/${input.slug}`, ownerInvite };
}

/** O que seria apagado por `removeClientBusiness` (o comando mostra antes de apagar). */
export async function summarizeClientBusiness(slug: string) {
  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      isDemo: true,
      _count: { select: { appointments: true, clients: true, users: true, professionals: true, payments: true } },
    },
  });
  if (!business) throw new ValidationError(`Nenhum negócio com o endereço "${slug}"`);
  return business;
}

/**
 * Apaga o negócio e tudo dele, numa transação. Agendamentos primeiro: eles
 * prendem clientes, profissionais e serviços (FK Restrict); o resto vai em
 * cascata com o negócio. Irreversível: o comando exige `--confirmar <slug>`.
 */
export async function removeClientBusiness(slug: string): Promise<void> {
  const { id } = await summarizeClientBusiness(slug);
  await prisma.$transaction([
    prisma.appointment.deleteMany({ where: { businessId: id } }),
    prisma.business.delete({ where: { id } }),
  ]);
}

/**
 * Grava o negócio com tudo o que vem do arquivo (sem usuários). Usado pelo
 * cliente real (`createClientBusiness`) e pela demonstração (`createDemoBusiness`).
 */
export async function insertClientBusiness(
  input: NewClientInput,
  images: { logoUrl: string | null; coverUrl: string | null },
  demo?: { expiresAt: Date | null },
): Promise<string> {
  // Inclui negócios removidos: o slug é único no banco e reaproveitar quebraria links antigos.
  const taken = await prisma.business.findUnique({ where: { slug: input.slug }, select: { id: true } });
  if (taken) throw new ValidationError(`O endereço "${input.slug}" já está em uso; escolha outro slug`);

  return prisma.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: {
        isDemo: Boolean(demo),
        demoExpiresAt: demo?.expiresAt ?? null,
        name: input.name,
        slug: input.slug,
        timezone: input.timezone,
        businessType: input.businessType,
        address: input.address,
        whatsapp: input.whatsapp,
        instagramUrl: input.instagramUrl,
        accentColor: input.accentColor,
        logoUrl: images.logoUrl,
        coverUrl: images.coverUrl,
        policyText: input.policies.policyText,
        minBookingNoticeMinutes: input.policies.minBookingNoticeMinutes,
        maxBookingWindowDays: input.policies.maxBookingWindowDays,
        cancellationDeadlineHours: input.policies.cancellationDeadlineHours,
        maxProfessionals: input.maxProfessionals,
        workingHours: { create: input.businessHours },
      },
    });

    // Categorias na ordem em que aparecem no catálogo; serviços na ordem dentro de cada uma.
    const categoryIds = new Map<string, string>();
    for (const name of [...new Set(input.services.map((service) => service.category))]) {
      const category = await tx.serviceCategory.create({ data: { businessId: business.id, name, position: categoryIds.size } });
      categoryIds.set(name, category.id);
    }
    const serviceIds = new Map<string, string>();
    const positions = new Map<string, number>();
    for (const service of input.services) {
      const position = positions.get(service.category) ?? 0;
      positions.set(service.category, position + 1);
      const created = await tx.service.create({
        data: {
          businessId: business.id,
          categoryId: categoryIds.get(service.category),
          name: service.name,
          description: service.description ?? null,
          durationMin: service.durationMin,
          priceCents: service.priceCents,
          priceType: service.priceFrom ? "FROM" : "FIXED",
          position,
        },
      });
      serviceIds.set(service.name, created.id);
    }

    for (const professional of input.professionals) {
      await tx.professional.create({
        data: {
          businessId: business.id,
          name: professional.name,
          specialty: professional.specialty,
          color: professional.color,
          commissionPercent: professional.commissionPercent,
          workingHours: { create: professional.workingHours },
          professionalServices: {
            create: professional.serviceNames.map((name) => ({ serviceId: serviceIds.get(name)! })),
          },
        },
      });
    }
    return business.id;
  });
}
