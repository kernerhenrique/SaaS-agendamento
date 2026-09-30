import { prisma } from "@/server/db/prisma";

import type { ProfessionalOption } from "./types";

/**
 * Profissionais ativos no formato que a agenda e o drawer do agendamento usam
 * (serviços que realizam + expediente). Compartilhado com o Financeiro, que
 * abre o mesmo drawer.
 */
export async function getProfessionalOptions(
  businessId: string,
  /** Profissional logado: só o próprio cadastro (a agenda dele). */
  scope: { professionalId?: string } = {},
): Promise<ProfessionalOption[]> {
  const professionals = await prisma.professional.findMany({
    where: { businessId, active: true, deletedAt: null, ...(scope.professionalId ? { id: scope.professionalId } : {}) },
    orderBy: { name: "asc" },
    include: {
      professionalServices: { include: { service: true } },
      workingHours: {
        select: { weekday: true, startMinute: true, endMinute: true, breakStartMinute: true, breakEndMinute: true },
      },
    },
  });

  return professionals.map((professional) => ({
    id: professional.id,
    name: professional.name,
    photoUrl: professional.photoUrl,
    color: professional.color,
    services: professional.professionalServices
      .filter((ps) => ps.service.active && !ps.service.deletedAt)
      .map((ps) => ({ id: ps.service.id, name: ps.service.name, durationMin: ps.service.durationMin })),
    workingHours: professional.workingHours,
  }));
}
