import { prisma } from "@/server/db/prisma";
import { ValidationError } from "@/server/errors";

export function listServiceCategories(businessId: string) {
  return prisma.serviceCategory.findMany({
    where: { businessId },
    orderBy: { position: "asc" },
  });
}

export async function createServiceCategory(businessId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new ValidationError("Nome é obrigatório");

  const existing = await prisma.serviceCategory.findFirst({ where: { businessId, name: trimmed } });
  if (existing) return existing;

  const count = await prisma.serviceCategory.count({ where: { businessId } });
  return prisma.serviceCategory.create({
    data: { businessId, name: trimmed, position: count },
  });
}
