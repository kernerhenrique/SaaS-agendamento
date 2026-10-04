import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DemoBar } from "@/components/demo-bar";
import { prisma } from "@/server/db/prisma";
import { listUpcomingClosures } from "@/server/modules/business/closure.service";
import { SERVICE_ORDER_BY } from "@/server/modules/service/service.service";

import { BookingFlow } from "./booking-flow";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const business = await prisma.business.findFirst({
    where: { slug, deletedAt: null },
    select: { name: true, address: true, logoUrl: true, isDemo: true },
  });
  if (!business) return {};
  // Demonstrações só circulam por link: fora das buscas.
  const robots = business.isDemo ? { index: false, follow: false } : undefined;

  const title = `${business.name} — agende online`;
  const description = business.address
    ? `Agende seu horário em ${business.name}, em ${business.address}.`
    : `Agende seu horário em ${business.name}.`;

  return {
    // `absolute`: a página pública é do negócio, sem o sufixo da marca do produto.
    title: { absolute: title },
    description,
    robots,
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
    include: { workingHours: { select: { weekday: true, startMinute: true, endMinute: true } } },
  });
  // Prévia de demonstração vencida (o cron apaga na madrugada): já some antes disso.
  if (!business || (business.isDemo && business.demoExpiresAt && business.demoExpiresAt <= new Date())) {
    notFound();
  }

  const [services, professionals, closures] = await Promise.all([
    prisma.service.findMany({
      where: { businessId: business.id, active: true, visibleOnline: true, deletedAt: null },
      orderBy: SERVICE_ORDER_BY,
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
    listUpcomingClosures(business.id, business.timezone),
  ]);
  // Serviço que nenhum profissional ativo realiza não teria horário nunca: fica
  // fora da página (o cliente não entra num beco sem saída). Em Serviços, o
  // painel avisa "Ninguém realiza".
  const offeredServiceIds = new Set(professionals.flatMap((p) => p.professionalServices.map((ps) => ps.serviceId)));
  const bookableServices = services.filter((service) => offeredServiceIds.has(service.id));

  return (
    <>
      {business.isDemo ? <DemoBar slug={business.slug} /> : null}
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
          coverUrl: business.coverUrl,
          workingHours: business.workingHours,
          minBookingNoticeMinutes: business.minBookingNoticeMinutes,
          maxBookingWindowDays: business.maxBookingWindowDays,
          cancellationDeadlineHours: business.cancellationDeadlineHours,
          closures: closures.map(({ startDate, endDate, reason }) => ({ startDate, endDate, reason })),
        }}
        services={bookableServices.map((service) => ({
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
    </>
  );
}
