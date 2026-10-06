"use client";

import { CalendarPlus, CircleCheckBig, Copy, MessageCircle, SquareArrowOutUpRight } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { BRAND } from "@/config/brand";
import { useVertical } from "@/config/vertical-context";
import { buildAppointmentIcs } from "@/lib/ics";
import { buildWhatsAppShareUrl, buildWhatsAppUrl } from "@/lib/whatsapp";

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
  /** E-mail informado na reserva (opcional): muda o texto e indica se o link também foi por e-mail. */
  clientEmail: string | null;
  /** Reservado já dentro do prazo de cancelamento: o link mostra os detalhes, mas não cancela nem remarca. */
  changeLocked: boolean;
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
  // Esta etapa só aparece depois do envio, no navegador: a origem já existe.
  const manageUrl = `${window.location.origin}/agendamento/${appointment.manageToken}/gerenciar`;
  const dateTime = formatFullDateTime(appointment.startAt, appointment.timezone);
  const saveToWhatsAppUrl = buildWhatsAppShareUrl(
    `Meu horário em ${appointment.businessName}: ${appointment.serviceName} com ${appointment.professionalName}, ${dateTime}.\n` +
      `${appointment.changeLocked ? "Detalhes do agendamento" : "Para cancelar ou remarcar"}: ${manageUrl}`,
  );

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(manageUrl);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar. Toque e segure o link para copiar.");
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center sm:items-start sm:text-left">
      <div className="flex flex-col items-center gap-2 sm:items-start">
        <CircleCheckBig className="size-12 text-primary" />
        <h2 className="text-lg font-medium">Horário confirmado!</h2>
        <p className="text-sm text-muted-foreground">
          {appointment.clientEmail ? (
            <>
              Enviamos os detalhes para <strong className="font-medium text-foreground">{appointment.clientEmail}</strong>.{" "}
              {appointment.changeLocked
                ? `O link abaixo mostra o seu horário. Como já está perto, para cancelar ou remarcar fale com ${appointment.businessName}.`
                : "Se precisar cancelar ou remarcar, é pelo link abaixo."}
            </>
          ) : appointment.changeLocked ? (
            <>Guarde o link abaixo com os detalhes do seu horário. Como já está perto, para cancelar ou remarcar fale com {appointment.businessName}.</>
          ) : (
            <>Guarde o link abaixo: se precisar cancelar ou remarcar, é por ele.</>
          )}
        </p>
      </div>

      <section
        aria-labelledby="manage-link-title"
        className="flex w-full flex-col gap-3 rounded-lg border border-primary/30 bg-primary/10 p-4 text-left"
      >
        <div className="flex flex-col gap-1">
          <h3 id="manage-link-title" className="text-sm font-medium">
            Seu link do agendamento
          </h3>
          <p className="break-all text-caption text-muted-foreground">{manageUrl}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href={saveToWhatsAppUrl}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ className: "w-full sm:w-auto" })}
          >
            <MessageCircle />
            Salvar no meu WhatsApp
          </a>
          <Button type="button" variant="outline" className="w-full bg-background sm:w-auto" onClick={copyLink}>
            <Copy />
            Copiar link
          </Button>
        </div>
      </section>

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
          <dd className="text-right font-medium first-letter:uppercase">{dateTime}</dd>
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
        <a href={manageUrl} className={buttonVariants({ variant: "outline" })}>
          <SquareArrowOutUpRight />
          Abrir meu agendamento
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
