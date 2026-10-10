import { prisma } from "@/server/db/prisma";
import { ValidationError } from "@/server/errors";

/**
 * Isolamento multi-tenant nas ligações entre cadastros: ids que chegam da tela
 * (profissionais de um serviço, serviços de um profissional, categoria) só valem
 * se forem do negócio da sessão. Sem isso, um corpo de requisição editado à mão
 * ligaria um cadastro a outro negócio. A mensagem é neutra: não revela se o id
 * existe em outro lugar. Id do próprio negócio já removido sai em silêncio: a
 * tela reenvia as ligações antigas (ex.: um serviço apagado depois) e salvar o
 * cadastro sem mexer nelas precisa continuar funcionando.
 */
const NOT_FOUND = "Cadastro não encontrado";

/** Ids repetidos saem; a ordem da primeira aparição fica. */
export function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

/** Algum id pedido não é do negócio (ficou de fora do que o banco achou nele)? */
export function hasForeignIds(requested: string[], found: { id: string }[]): boolean {
  const owned = new Set(found.map((row) => row.id));
  return requested.some((id) => !owned.has(id));
}

/** Só os que continuam no cadastro (removido não volta a ser ligado). */
export function withoutDeleted(requested: string[], found: { id: string; deletedAt: Date | null }[]): string[] {
  const removed = new Set(found.filter((row) => row.deletedAt !== null).map((row) => row.id));
  return requested.filter((id) => !removed.has(id));
}

export async function ownedProfessionalIds(businessId: string, ids: string[]): Promise<string[]> {
  const requested = uniqueIds(ids);
  if (requested.length === 0) return requested;
  const found = await prisma.professional.findMany({
    where: { id: { in: requested }, businessId },
    select: { id: true, deletedAt: true },
  });
  if (hasForeignIds(requested, found)) throw new ValidationError(NOT_FOUND);
  return withoutDeleted(requested, found);
}

export async function ownedServiceIds(businessId: string, ids: string[]): Promise<string[]> {
  const requested = uniqueIds(ids);
  if (requested.length === 0) return requested;
  const found = await prisma.service.findMany({
    where: { id: { in: requested }, businessId },
    select: { id: true, deletedAt: true },
  });
  if (hasForeignIds(requested, found)) throw new ValidationError(NOT_FOUND);
  return withoutDeleted(requested, found);
}

export async function ownedCategoryId(businessId: string, categoryId: string | null | undefined): Promise<string | null> {
  if (!categoryId) return null;
  const found = await prisma.serviceCategory.findFirst({ where: { id: categoryId, businessId }, select: { id: true } });
  if (!found) throw new ValidationError(NOT_FOUND);
  return found.id;
}
