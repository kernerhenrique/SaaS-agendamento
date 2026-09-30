import { notFound } from "next/navigation";

import { NotFoundError } from "@/server/errors";
import { prisma } from "@/server/db/prisma";
import { requirePagePermission } from "@/server/modules/auth/page-access";
import { getProfessionalProfile } from "@/server/modules/professional/professional-profile.service";

import { ProfessionalProfile } from "./professional-profile";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePagePermission("catalog.manage");
  const { id } = await params;
  const professional = await prisma.professional.findFirst({
    where: { id, businessId: session.businessId, deletedAt: null },
    select: { name: true },
  });
  return { title: professional?.name ?? "Cadastro" };
}

export default async function ProfissionalPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePagePermission("catalog.manage");
  const { id } = await params;
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: session.businessId },
    select: { timezone: true },
  });

  const [profile, services] = await Promise.all([
    getProfessionalProfile(session.businessId, id, business.timezone).catch((error) => {
      if (error instanceof NotFoundError) notFound();
      throw error;
    }),
    prisma.service.findMany({
      where: { businessId: session.businessId, active: true, deletedAt: null },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  return (
    <ProfessionalProfile
      professional={profile.professional}
      upcoming={profile.upcoming.map((a) => ({
        id: a.id,
        status: a.status,
        startAt: a.startAt.toISOString(),
        endAt: a.endAt.toISOString(),
        clientName: a.client.name,
        serviceName: a.service.name,
      }))}
      month={profile.month}
      services={services}
      timezone={business.timezone}
    />
  );
}
