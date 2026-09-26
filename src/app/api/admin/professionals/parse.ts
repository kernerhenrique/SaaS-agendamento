import { Weekday } from "@/generated/prisma/enums";
import { ValidationError } from "@/server/errors";
import type { ProfessionalInput, WorkingHoursInput } from "@/server/modules/professional/professional.service";

const WEEKDAY_VALUES = new Set<string>(Object.values(Weekday));

function parseWorkingHours(raw: unknown): WorkingHoursInput[] {
  if (!Array.isArray(raw)) {
    throw new ValidationError("workingHours deve ser uma lista");
  }
  return raw.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      throw new ValidationError(`workingHours[${index}] inválido`);
    }
    const { weekday, startMinute, endMinute, breakStartMinute, breakEndMinute } = entry as Record<
      string,
      unknown
    >;
    if (typeof weekday !== "string" || !WEEKDAY_VALUES.has(weekday)) {
      throw new ValidationError(`workingHours[${index}].weekday inválido`);
    }
    if (typeof startMinute !== "number" || typeof endMinute !== "number") {
      throw new ValidationError(`workingHours[${index}] precisa de startMinute e endMinute numéricos`);
    }
    return {
      weekday: weekday as Weekday,
      startMinute,
      endMinute,
      breakStartMinute: typeof breakStartMinute === "number" ? breakStartMinute : null,
      breakEndMinute: typeof breakEndMinute === "number" ? breakEndMinute : null,
    };
  });
}

export function parseProfessionalInput(body: unknown): ProfessionalInput {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Corpo da requisição inválido");
  }
  const { name, bio, specialty, photoUrl, photoUrls, serviceIds, workingHours } = body as Record<string, unknown>;

  if (typeof name !== "string") {
    throw new ValidationError("name é obrigatório");
  }
  if (!Array.isArray(serviceIds) || !serviceIds.every((id) => typeof id === "string")) {
    throw new ValidationError("serviceIds deve ser uma lista de strings");
  }
  if (photoUrls !== undefined && (!Array.isArray(photoUrls) || !photoUrls.every((url) => typeof url === "string"))) {
    throw new ValidationError("photoUrls deve ser uma lista de strings");
  }

  return {
    name,
    bio: typeof bio === "string" ? bio : null,
    specialty: typeof specialty === "string" && specialty.trim() ? specialty.trim() : null,
    photoUrl: typeof photoUrl === "string" ? photoUrl : null,
    photoUrls: photoUrls as string[] | undefined,
    serviceIds,
    workingHours: parseWorkingHours(workingHours),
  };
}
