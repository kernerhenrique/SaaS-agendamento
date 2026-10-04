import type { Metadata } from "next";
import { headers } from "next/headers";

import { VerticalProvider } from "@/config/vertical-context";
import { checkRateLimit, getClientIp, MANAGE_TOKEN_RATE_LIMIT } from "@/lib/rate-limit";
import { NotFoundError } from "@/server/errors";
import { clientCanChange, getAppointmentForManagement, getSeriesForClient } from "@/server/modules/appointment/manage.service";

import { ManageView } from "./manage-view";

/** Aba com o nome do negócio (não "Aprazzo") e fora das buscas: o link é pessoal. */
export async function generateMetadata({ params }: { params: Promise<{ manageToken: string }> }): Promise<Metadata> {
  const { manageToken } = await params;
  const robots = { index: false, follow: false };
  try {
    const appointment = await getAppointmentForManagement(manageToken);
    return { title: { absolute: `Seu agendamento · ${appointment.business.name}` }, robots };
  } catch {
    return { title: { absolute: "Seu agendamento" }, robots };
  }
}

export default async function ManageAppointmentPage({
  params,
}: {
  params: Promise<{ manageToken: string }>;
}) {
  const { manageToken } = await params;

  const headersList = await headers();
  const ip = getClientIp(headersList);
  const rateLimit = checkRateLimit(`manage-token:${ip}`, MANAGE_TOKEN_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return <MessagePage message="Muitas tentativas. Tente novamente em instantes." />;
  }

  let appointment: Awaited<ReturnType<typeof getAppointmentForManagement>>;
  try {
    appointment = await getAppointmentForManagement(manageToken);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return <MessagePage message={error.message} />;
    }
    throw error;
  }

  // Server Component: roda uma única vez por requisição no servidor, sem as
  // preocupações de hidratação/novas renderizações que a regra de pureza do
  // eslint-plugin-react-hooks existe para prevenir em Client Components.
  // eslint-disable-next-line react-hooks/purity
  const initialIsFuture = appointment.startAt.getTime() > Date.now();
  const series = await getSeriesForClient(appointment);

  return (
    <VerticalProvider verticalKey={appointment.business.businessType}>
    <ManageView
      token={manageToken}
      initialIsFuture={initialIsFuture}
      initialCanChange={clientCanChange(appointment)}
      series={series}
      appointment={{
        id: appointment.id,
        status: appointment.status,
        startAt: appointment.startAt.toISOString(),
        endAt: appointment.endAt.toISOString(),
        business: {
          id: appointment.business.id,
          name: appointment.business.name,
          slug: appointment.business.slug,
          timezone: appointment.business.timezone,
          address: appointment.business.address,
          whatsapp: appointment.business.whatsapp,
          logoUrl: appointment.business.logoUrl,
          accentColor: appointment.business.accentColor,
          maxBookingWindowDays: appointment.business.maxBookingWindowDays,
          cancellationDeadlineHours: appointment.business.cancellationDeadlineHours,
        },
        professional: { id: appointment.professional.id, name: appointment.professional.name },
        service: {
          id: appointment.service.id,
          name: appointment.service.name,
          durationMin: appointment.service.durationMin,
        },
        client: { name: appointment.client.name },
      }}
    />
    </VerticalProvider>
  );
}

function MessagePage({ message }: { message: string }) {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <p className="text-sm text-muted-foreground">{message}</p>
    </main>
  );
}
