import { notFound } from "next/navigation";

import { prisma } from "@/server/db/prisma";

import { BookingFlow } from "./booking-flow";

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const business = await prisma.business.findFirst({
    where: { slug, deletedAt: null },
  });
  if (!business) {
    notFound();
  }

  const [services, professionals] = await Promise.all([
    prisma.service.findMany({
      where: { businessId: business.id, active: true, deletedAt: null },
      orderBy: { name: "asc" },
    }),
    prisma.professional.findMany({
      where: { businessId: business.id, active: true, deletedAt: null },
      orderBy: { name: "asc" },
      include: { professionalServices: { select: { serviceId: true } } },
    }),
  ]);

  return (
    <BookingFlow
      business={{
        id: business.id,
        name: business.name,
        slug: business.slug,
        timezone: business.timezone,
        address: business.address,
        accentColor: business.accentColor,
      }}
      services={services.map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        durationMin: service.durationMin,
        priceCents: service.priceCents,
      }))}
      professionals={professionals.map((professional) => ({
        id: professional.id,
        name: professional.name,
        photoUrl: professional.photoUrl,
        serviceIds: professional.professionalServices.map((ps) => ps.serviceId),
      }))}
    />
  );
}
