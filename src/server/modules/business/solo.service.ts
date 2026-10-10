import { prisma } from "@/server/db/prisma";

import type { SoloHoursInput } from "./business-rules";
import { isSoloPlan } from "./plan-rules";

/**
 * Plano Solo (`isSoloPlan`): a pessoa que atende é o próprio negócio. Aqui ficam
 * as leituras e gravações que tratam as duas coisas como uma só. Tudo depende do
 * plano, nunca da contagem: negócio de equipe recebe `null` e segue como sempre.
 */

/** A única pessoa do Solo (a ativa; se pausada por dado antigo, a mais antiga). `null` fora do Solo. */
export async function getSoloProfessional(businessId: string) {
  const business = await prisma.business.findUnique({ where: { id: businessId }, select: { maxProfessionals: true } });
  if (!business || !isSoloPlan(business.maxProfessionals)) return null;
  return prisma.professional.findFirst({
    where: { businessId, deletedAt: null },
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      workingHours: {
        select: { weekday: true, startMinute: true, endMinute: true, breakStartMinute: true, breakEndMinute: true },
      },
    },
  });
}

export type SoloProfessional = NonNullable<Awaited<ReturnType<typeof getSoloProfessional>>>;

/**
 * Grava a semana do Solo de uma vez: horário da página (sem intervalo) e
 * expediente da pessoa (com intervalo), na mesma transação. Assim os dois nunca
 * se contradizem. A disponibilidade continua vindo só do expediente.
 */
export async function replaceSoloHours(businessId: string, professionalId: string, hours: SoloHoursInput[]): Promise<void> {
  await prisma.$transaction([
    prisma.businessWorkingHours.deleteMany({ where: { businessId } }),
    prisma.businessWorkingHours.createMany({
      data: hours.map(({ weekday, startMinute, endMinute }) => ({ businessId, weekday, startMinute, endMinute })),
    }),
    prisma.workingHours.deleteMany({ where: { professionalId } }),
    prisma.workingHours.createMany({ data: hours.map((day) => ({ ...day, professionalId })) }),
  ]);
}

export function renameSoloProfessional(professionalId: string, name: string) {
  return prisma.professional.update({ where: { id: professionalId }, data: { name }, select: { id: true } });
}
