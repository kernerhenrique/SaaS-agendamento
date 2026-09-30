import { prisma } from "@/server/db/prisma";
import { requirePagePermission } from "@/server/modules/auth/page-access";

import { NewProfessionalView } from "./new-professional-view";

export const metadata = { title: "Novo cadastro" };

export default async function NovoProfissionalPage() {
  const session = await requirePagePermission("catalog.manage");
  const [business, services] = await Promise.all([
    prisma.business.findUniqueOrThrow({ where: { id: session.businessId }, select: { timezone: true } }),
    prisma.service.findMany({
      where: { businessId: session.businessId, active: true, deletedAt: null },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  return <NewProfessionalView services={services} timezone={business.timezone} />;
}
