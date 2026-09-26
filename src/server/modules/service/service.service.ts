import { ServicePriceType } from "@/generated/prisma/enums";
import { prisma } from "@/server/db/prisma";
import { NotFoundError, ValidationError } from "@/server/errors";

export interface ServiceInput {
  name: string;
  description?: string | null;
  durationMin: number;
  priceCents: number;
  priceType?: ServicePriceType;
  categoryId?: string | null;
  professionalIds: string[];
}

function validateServiceInput(input: ServiceInput): void {
  if (!input.name.trim()) throw new ValidationError("Nome é obrigatório");
  if (!Number.isInteger(input.durationMin) || input.durationMin <= 0) {
    throw new ValidationError("Duração deve ser um número inteiro de minutos maior que zero");
  }
  if (!Number.isInteger(input.priceCents) || input.priceCents < 0) {
    throw new ValidationError("Preço deve ser um valor em centavos, inteiro e não negativo");
  }
  if (input.priceType && !Object.values(ServicePriceType).includes(input.priceType)) {
    throw new ValidationError("Tipo de preço inválido");
  }
}

export function listServices(businessId: string) {
  return prisma.service.findMany({
    where: { businessId, deletedAt: null },
    include: { professionalServices: { include: { professional: true } }, category: true },
    orderBy: { name: "asc" },
  });
}

export async function createService(businessId: string, input: ServiceInput) {
  validateServiceInput(input);

  return prisma.service.create({
    data: {
      businessId,
      name: input.name.trim(),
      description: input.description ?? null,
      durationMin: input.durationMin,
      priceCents: input.priceCents,
      priceType: input.priceType ?? ServicePriceType.FIXED,
      categoryId: input.categoryId ?? null,
      professionalServices: {
        create: input.professionalIds.map((professionalId) => ({ professionalId })),
      },
    },
    include: { professionalServices: true, category: true },
  });
}

export async function updateService(businessId: string, id: string, input: ServiceInput) {
  validateServiceInput(input);

  const existing = await prisma.service.findFirst({ where: { id, businessId, deletedAt: null } });
  if (!existing) throw new NotFoundError("Cadastro não encontrado");

  return prisma.$transaction(async (tx) => {
    await tx.professionalService.deleteMany({ where: { serviceId: id } });

    return tx.service.update({
      where: { id },
      data: {
        name: input.name.trim(),
        description: input.description ?? null,
        durationMin: input.durationMin,
        priceCents: input.priceCents,
        priceType: input.priceType ?? ServicePriceType.FIXED,
        categoryId: input.categoryId ?? null,
        professionalServices: {
          create: input.professionalIds.map((professionalId) => ({ professionalId })),
        },
      },
      include: { professionalServices: true, category: true },
    });
  });
}

export async function deleteService(businessId: string, id: string) {
  const existing = await prisma.service.findFirst({ where: { id, businessId, deletedAt: null } });
  if (!existing) throw new NotFoundError("Cadastro não encontrado");

  await prisma.service.update({
    where: { id },
    data: { active: false, deletedAt: new Date() },
  });
}
