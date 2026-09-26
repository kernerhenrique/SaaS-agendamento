"use client";

import { CalendarPlus, CircleCheckBig, MessageCircle, SquareArrowOutUpRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { BRAND } from "@/config/brand";
import { useVertical } from "@/config/vertical-context";
import { buildAppointmentIcs } from "@/lib/ics";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export interface ConfirmedAppointmentInfo {
  id: string;
  manageToken: string;
  startAt: string;
  endAt: string;
  serviceName: string;
  professionalName: string;
  businessName: string;
  businessAddress: string | null;
  businessWhatsapp: string | null;
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
  const { terms } = useVertical();
  const icsContent = buildAppointmentIcs({
    uid: `${appointment.id}@${BRAND.slug}`,
    startAt: new Date(appointment.startAt),
    endAt: new Date(appointment.endAt),
    summary: `${appointment.serviceName} — ${appointment.businessName}`,
    description: `Agendamento com ${appointment.professionalName} em ${appointment.businessName}`,
    location: appointment.businessAddress ?? undefined,
  });
  const icsHref = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;

  return (
    <div className="flex flex-col items-center gap-4 text-center sm:items-start sm:text-left">
      <div className="flex flex-col items-center gap-2 sm:items-start">
        <CircleCheckBig className="size-12 text-primary" />
        <h2 className="text-lg font-medium">Agendamento confirmado!</h2>
        <p className="text-sm text-muted-foreground">
          Enviamos um e-mail de confirmação com o link para cancelar ou reagendar.
        </p>
      </div>

      <dl className="flex w-full flex-col gap-1 rounded-lg bg-card p-4 text-sm shadow-sm ring-1 ring-foreground/10">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{terms.service.singular}</dt>
          <dd className="font-medium">{appointment.serviceName}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{terms.professional.singular}</dt>
          <dd className="font-medium">{appointment.professionalName}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Data/hora</dt>
          <dd className="text-right font-medium first-letter:uppercase">
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

      {/* Precisa continuar sendo <a> de verdade (role="link"), não um
          Button estilizado: o Button do Base UI sempre se anuncia como
          role="button" para leitores de tela, mesmo renderizando outro
          elemento por baixo — então aplicamos os estilos via buttonVariants
          direto no link nativo. */}
      <div className="flex flex-wrap gap-2">
        <a href={icsHref} download="agendamento.ics" className={buttonVariants({ variant: "outline" })}>
          <CalendarPlus />
          Adicionar ao calendário (.ics)
        </a>
        <a
          href={`/agendamento/${appointment.manageToken}/gerenciar`}
          className={buttonVariants({ variant: "outline" })}
        >
          <SquareArrowOutUpRight />
          Gerenciar meu agendamento
        </a>
        {appointment.businessWhatsapp ? (
          <a
            href={buildWhatsAppUrl(appointment.businessWhatsapp)}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "outline" })}
          >
            <MessageCircle />
            Falar no WhatsApp
          </a>
        ) : null}
      </div>
    </div>
  );
}
