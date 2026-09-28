import { prisma } from "@/server/db/prisma";
import { requireAdminSession } from "@/server/modules/auth/session";

import { AgendaView } from "./agenda-view";
import { getProfessionalOptions } from "./professional-options";

export const metadata = { title: "Agenda" };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const session = await requireAdminSession();
  const { date } = await searchParams;

  const [business, professionalOptions] = await Promise.all([
    prisma.business.findUniqueOrThrow({ where: { id: session.businessId } }),
    getProfessionalOptions(session.businessId),
  ]);

  return (
    <AgendaView
      // Busca (Ctrl+K) navega para ?date=… estando já na agenda: a key remonta com a nova data.
      key={date ?? "hoje"}
      timezone={business.timezone}
      professionals={professionalOptions}
      initialDate={date && DATE_PATTERN.test(date) ? date : undefined}
    />
  );
}
