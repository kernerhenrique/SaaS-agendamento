import { prisma } from "@/server/db/prisma";
import { requirePagePermission } from "@/server/modules/auth/page-access";

import { NewProfessionalView } from "./new-professional-view";

export const metadata = { title: "Novo cadastro" };

export default async function NovoProfissionalPage() {
  const session = await requirePagePermission("catalog.manage");
  const [services, businessHours] = await Promise.all([
    prisma.service.findMany({
      where: { businessId: session.businessId, active: true, deletedAt: null },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.businessWorkingHours.findMany({ where: { businessId: session.businessId }, select: { weekday: true, startMinute: true, endMinute: true } }),
  ]);

  return <NewProfessionalView services={services} businessHours={businessHours} />;
}
