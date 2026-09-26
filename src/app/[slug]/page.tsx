import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/server/db/prisma";

import { BookingFlow } from "./booking-flow";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const business = await prisma.business.findFirst({
    where: { slug, deletedAt: null },
    select: { name: true, address: true, logoUrl: true },
  });
  if (!business) return {};

  const title = `${business.name} — agende online`;
  const description = business.address
    ? `Agende seu horário em ${business.name}, em ${business.address}.`
    : `Agende seu horário em ${business.name}.`;

  return {
    // `absolute`: a página pública é do negócio, sem o sufixo da marca do produto.
    title: { absolute: title },
    description,
    openGraph: {
      title,
      description,
      images: business.logoUrl ? [{ url: business.logoUrl }] : undefined,
    },
  };
}

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
      include: { category: true },
    }),
    prisma.professional.findMany({
      where: { businessId: business.id, active: true, deletedAt: null },
      orderBy: { name: "asc" },
      include: {
        professionalServices: { select: { serviceId: true } },
        photos: { orderBy: { position: "asc" } },
      },
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
        logoUrl: business.logoUrl,
        whatsapp: business.whatsapp,
        instagramUrl: business.instagramUrl,
        policyText: business.policyText,
        businessType: business.businessType,
      }}
      services={services.map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        durationMin: service.durationMin,
        priceCents: service.priceCents,
        priceType: service.priceType,
        categoryName: service.category?.name ?? null,
      }))}
      professionals={professionals.map((professional) => ({
        id: professional.id,
        name: professional.name,
        photoUrl: professional.photoUrl,
        bio: professional.bio,
        specialty: professional.specialty,
        photoUrls: professional.photos.map((photo) => photo.url),
        serviceIds: professional.professionalServices.map((ps) => ps.serviceId),
      }))}
    />
  );
}
