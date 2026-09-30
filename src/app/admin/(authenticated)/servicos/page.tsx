import { prisma } from "@/server/db/prisma";
import { requirePagePermission } from "@/server/modules/auth/page-access";
import { listServices } from "@/server/modules/service/service.service";

import { ServicesView } from "./services-view";

export const metadata = { title: "Serviços" };

export default async function ServicosPage() {
  const session = await requirePagePermission("catalog.manage");

  const [services, professionals, categories] = await Promise.all([
    listServices(session.businessId),
    prisma.professional.findMany({
      where: { businessId: session.businessId, active: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.serviceCategory.findMany({
      where: { businessId: session.businessId },
      orderBy: { position: "asc" },
    }),
  ]);

  return <ServicesView initialServices={services} professionals={professionals} initialCategories={categories} />;
}
