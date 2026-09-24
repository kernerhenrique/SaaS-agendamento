import { prisma } from "@/server/db/prisma";
import { requireAdminSession } from "@/server/modules/auth/session";

import { ProfessionalsView } from "./professionals-view";

export default async function ProfissionaisPage() {
  const session = await requireAdminSession();

  const [business, professionals, services] = await Promise.all([
    prisma.business.findUniqueOrThrow({ where: { id: session.businessId } }),
    prisma.professional.findMany({
      where: { businessId: session.businessId, deletedAt: null },
      orderBy: { name: "asc" },
      include: { workingHours: true, professionalServices: { include: { service: true } } },
    }),
    prisma.service.findMany({
      where: { businessId: session.businessId, active: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <ProfessionalsView
      initialProfessionals={professionals}
      services={services}
      timezone={business.timezone}
    />
  );
}
