import { headers } from "next/headers";

import { checkRateLimit, getClientIp, MANAGE_TOKEN_RATE_LIMIT } from "@/lib/rate-limit";
import { NotFoundError } from "@/server/errors";
import { getAppointmentForManagement } from "@/server/modules/appointment/manage.service";

import { ManageView } from "./manage-view";

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

  return (
    <ManageView
      token={manageToken}
      initialIsFuture={initialIsFuture}
      appointment={{
        status: appointment.status,
        startAt: appointment.startAt.toISOString(),
        endAt: appointment.endAt.toISOString(),
        business: {
          id: appointment.business.id,
          name: appointment.business.name,
          timezone: appointment.business.timezone,
          address: appointment.business.address,
        },
        professional: { id: appointment.professional.id, name: appointment.professional.name },
        service: {
          id: appointment.service.id,
          name: appointment.service.name,
          durationMin: appointment.service.durationMin,
        },
        client: { name: appointment.client.name },
        review: appointment.review
          ? { rating: appointment.review.rating, comment: appointment.review.comment }
          : null,
      }}
    />
  );
}

function MessagePage({ message }: { message: string }) {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <p className="text-sm text-muted-foreground">{message}</p>
    </main>
  );
}
