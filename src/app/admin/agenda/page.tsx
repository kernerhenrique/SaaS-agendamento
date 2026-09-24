import { prisma } from "@/server/db/prisma";
import { requireAdminSession } from "@/server/modules/auth/session";

import { AgendaView } from "./agenda-view";

export default async function AgendaPage() {
  const session = await requireAdminSession();

  const [business, professionals] = await Promise.all([
    prisma.business.findUniqueOrThrow({ where: { id: session.businessId } }),
    prisma.professional.findMany({
      where: { businessId: session.businessId, active: true, deletedAt: null },
      orderBy: { name: "asc" },
      include: { professionalServices: { include: { service: true } } },
    }),
  ]);

  const professionalOptions = professionals.map((professional) => ({
    id: professional.id,
    name: professional.name,
    services: professional.professionalServices
      .filter((ps) => ps.service.active && !ps.service.deletedAt)
      .map((ps) => ({
        id: ps.service.id,
        name: ps.service.name,
        durationMin: ps.service.durationMin,
      })),
  }));

  return <AgendaView timezone={business.timezone} professionals={professionalOptions} />;
}
