import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/server/db/prisma";
import { requirePagePermission } from "@/server/modules/auth/page-access";
import { getSoloProfessional } from "@/server/modules/business/solo.service";

import { TimeBlocksManager } from "../profissionais/time-blocks-manager";

export const metadata = { title: "Folgas" };

/**
 * Plano Solo: folgas, médico e férias de quem atende. É a única parte do antigo
 * cadastro que não existe em outro lugar (horário fica em Configurações). Fora
 * do Solo, as folgas ficam no cadastro de cada profissional.
 */
export default async function FolgasPage() {
  const session = await requirePagePermission("catalog.manage");
  const soloProfessional = await getSoloProfessional(session.businessId);
  if (!soloProfessional) redirect("/admin/profissionais");
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: session.businessId },
    select: { timezone: true },
  });

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-page-title font-bold">Folgas</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Dias ou horários em que você não atende. Seus dias e horários de sempre ficam em{" "}
          <Link href="/admin/configuracoes#horario" className="font-medium text-primary underline-offset-4 hover:underline">
            Configurações › Horário
          </Link>
          .
        </p>
      </div>
      <TimeBlocksManager professionalId={soloProfessional.id} timezone={business.timezone} />
    </main>
  );
}
