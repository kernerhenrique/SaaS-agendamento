import { Contact } from "lucide-react";

import { ComingSoon } from "@/components/admin/coming-soon";
import { getVertical } from "@/config/vertical";
import { prisma } from "@/server/db/prisma";
import { requireAdminSession } from "@/server/modules/auth/session";

export const metadata = { title: "Clientes" };

export default async function ClientesPage() {
  const session = await requireAdminSession();
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: session.businessId },
    select: { businessType: true },
  });
  const { terms } = getVertical(business.businessType);

  return (
    <ComingSoon
      title={terms.client.plural}
      icon={Contact}
      description="Ficha com histórico, notas, tags e filtros como “não volta há 60 dias” — próximo bloco desta fase."
    />
  );
}
