import { prisma } from "@/server/db/prisma";
import { requireAdminSession } from "@/server/modules/auth/session";

import { ServicesView } from "./services-view";

export default async function ServicosPage() {
  const session = await requireAdminSession();

  const [services, professionals] = await Promise.all([
    prisma.service.findMany({
      where: { businessId: session.businessId, deletedAt: null },
      orderBy: { name: "asc" },
      include: { professionalServices: { include: { professional: true } } },
    }),
    prisma.professional.findMany({
      where: { businessId: session.businessId, active: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return <ServicesView initialServices={services} professionals={professionals} />;
}
