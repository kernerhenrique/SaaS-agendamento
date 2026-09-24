import { buildAppointmentIcs } from "@/lib/ics";

export interface ConfirmedAppointmentInfo {
  id: string;
  startAt: string;
  endAt: string;
  serviceName: string;
  professionalName: string;
  businessName: string;
  businessAddress: string | null;
  timezone: string;
}

function formatFullDateTime(dateISO: string, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(dateISO));
}

export function ConfirmationStep({ appointment }: { appointment: ConfirmedAppointmentInfo }) {
  const icsContent = buildAppointmentIcs({
    uid: `${appointment.id}@agendamento-saas`,
    startAt: new Date(appointment.startAt),
    endAt: new Date(appointment.endAt),
    summary: `${appointment.serviceName} — ${appointment.businessName}`,
    description: `Agendamento com ${appointment.professionalName} em ${appointment.businessName}`,
    location: appointment.businessAddress ?? undefined,
  });
  const icsHref = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-medium">Agendamento confirmado!</h2>
        <p className="text-sm text-muted-foreground">
          Enviamos um e-mail de confirmação com o link para cancelar ou reagendar.
        </p>
      </div>

      <dl className="flex flex-col gap-1 rounded-lg border p-4 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Serviço</dt>
          <dd className="font-medium">{appointment.serviceName}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Profissional</dt>
          <dd className="font-medium">{appointment.professionalName}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Data/hora</dt>
          <dd className="text-right font-medium capitalize">
            {formatFullDateTime(appointment.startAt, appointment.timezone)}
          </dd>
        </div>
        {appointment.businessAddress ? (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Endereço</dt>
            <dd className="text-right font-medium">{appointment.businessAddress}</dd>
          </div>
        ) : null}
      </dl>

      <a
        href={icsHref}
        download="agendamento.ics"
        className="inline-flex w-fit items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
      >
        Adicionar ao calendário (.ics)
      </a>
    </div>
  );
}
