import { prisma } from "@/server/db/prisma";
import { requireAdminSession } from "@/server/modules/auth/session";

import { ProfessionalsView } from "./professionals-view";

export const metadata = { title: "Profissionais" };

export default async function ProfissionaisPage() {
  const session = await requireAdminSession();

  const professionals = await prisma.professional.findMany({
    where: { businessId: session.businessId, deletedAt: null },
    // Ativos primeiro; inativos continuam acessíveis para reativar.
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      workingHours: true,
      professionalServices: { include: { service: true } },
      photos: { orderBy: { position: "asc" } },
    },
  });

  return <ProfessionalsView professionals={professionals} />;
}
