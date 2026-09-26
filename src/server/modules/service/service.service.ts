import { ServicePriceType } from "@/generated/prisma/enums";
import { prisma } from "@/server/db/prisma";
import { NotFoundError, ValidationError } from "@/server/errors";

import { moveWithinCategory, type MoveDirection } from "./service-order";

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

/**
 * Ordem única usada no painel e na página pública: categoria (pela ordem da
 * categoria; sem categoria por último), depois a posição escolhida pelo dono.
 */
export const SERVICE_ORDER_BY = [
  { category: { position: "asc" as const } },
  { position: "asc" as const },
  { name: "asc" as const },
];

export function listServices(businessId: string) {
  return prisma.service.findMany({
    where: { businessId, deletedAt: null },
    include: { professionalServices: { include: { professional: true } }, category: true },
    orderBy: SERVICE_ORDER_BY,
  });
}

export async function createService(businessId: string, input: ServiceInput) {
  validateServiceInput(input);
  // Novo serviço entra no fim da lista.
  const last = await prisma.service.aggregate({ where: { businessId, deletedAt: null }, _max: { position: true } });

  return prisma.service.create({
    data: {
      businessId,
      position: (last._max.position ?? -1) + 1,
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

/** Liga/desliga "Visível na página pública". Oculto continua disponível para encaixe no painel. */
export async function setServiceVisibility(businessId: string, id: string, visibleOnline: boolean) {
  const existing = await prisma.service.findFirst({ where: { id, businessId, deletedAt: null }, select: { id: true } });
  if (!existing) throw new NotFoundError("Cadastro não encontrado");
  return prisma.service.update({ where: { id }, data: { visibleOnline }, select: { id: true, visibleOnline: true } });
}

/**
 * Sobe/desce um serviço dentro da categoria. Regrava a posição de todos
 * (0..n) — assim a ordem fica bem definida mesmo vindo de dados antigos, em
 * que todos tinham posição 0.
 */
export async function moveService(businessId: string, id: string, direction: MoveDirection) {
  const services = await prisma.service.findMany({
    where: { businessId, deletedAt: null },
    select: { id: true, categoryId: true },
    orderBy: SERVICE_ORDER_BY,
  });
  if (!services.some((s) => s.id === id)) throw new NotFoundError("Cadastro não encontrado");

  const orderedIds = moveWithinCategory(services, id, direction);
  await prisma.$transaction(
    orderedIds.map((serviceId, position) => prisma.service.update({ where: { id: serviceId }, data: { position } })),
  );
}

export async function deleteService(businessId: string, id: string) {
  const existing = await prisma.service.findFirst({ where: { id, businessId, deletedAt: null } });
  if (!existing) throw new NotFoundError("Cadastro não encontrado");

  await prisma.service.update({
    where: { id },
    data: { active: false, deletedAt: new Date() },
  });
}
