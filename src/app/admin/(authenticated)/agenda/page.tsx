import { prisma } from "@/server/db/prisma";
import { requireAdminSession } from "@/server/modules/auth/session";

import { AgendaView } from "./agenda-view";

export const metadata = { title: "Agenda" };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const session = await requireAdminSession();
  const { date } = await searchParams;

  const [business, professionals] = await Promise.all([
    prisma.business.findUniqueOrThrow({ where: { id: session.businessId } }),
    prisma.professional.findMany({
      where: { businessId: session.businessId, active: true, deletedAt: null },
      orderBy: { name: "asc" },
      include: {
        professionalServices: { include: { service: true } },
        workingHours: {
          select: {
            weekday: true,
            startMinute: true,
            endMinute: true,
            breakStartMinute: true,
            breakEndMinute: true,
          },
        },
      },
    }),
  ]);

  const professionalOptions = professionals.map((professional) => ({
    id: professional.id,
    name: professional.name,
    photoUrl: professional.photoUrl,
    services: professional.professionalServices
      .filter((ps) => ps.service.active && !ps.service.deletedAt)
      .map((ps) => ({
        id: ps.service.id,
        name: ps.service.name,
        durationMin: ps.service.durationMin,
      })),
    workingHours: professional.workingHours,
  }));

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
