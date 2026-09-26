import { ServicePriceType } from "@/generated/prisma/enums";
import { ValidationError } from "@/server/errors";
import type { ServiceInput } from "@/server/modules/service/service.service";

export function parseServiceInput(body: unknown): ServiceInput {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Corpo da requisição inválido");
  }
  const { name, description, durationMin, priceCents, priceType, categoryId, professionalIds } =
    body as Record<string, unknown>;

  if (typeof name !== "string") {
    throw new ValidationError("name é obrigatório");
  }
  if (typeof durationMin !== "number") {
    throw new ValidationError("durationMin deve ser numérico");
  }
  if (typeof priceCents !== "number") {
    throw new ValidationError("priceCents deve ser numérico");
  }
  if (priceType !== undefined && !Object.values(ServicePriceType).includes(priceType as ServicePriceType)) {
    throw new ValidationError("priceType inválido");
  }
  if (!Array.isArray(professionalIds) || !professionalIds.every((id) => typeof id === "string")) {
    throw new ValidationError("professionalIds deve ser uma lista de strings");
  }

  return {
    name,
    description: typeof description === "string" ? description : null,
    durationMin,
    priceCents,
    priceType: priceType as ServicePriceType | undefined,
    categoryId: typeof categoryId === "string" ? categoryId : null,
    professionalIds,
  };
}
