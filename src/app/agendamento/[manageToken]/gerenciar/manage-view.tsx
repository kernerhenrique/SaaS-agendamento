"use client";

import { useState } from "react";
import { CalendarCheck, CalendarClock, CalendarPlus, CalendarX, MapPin, MessageCircle, Repeat } from "lucide-react";
import { toast } from "sonner";

import { AccentColorScope } from "@/components/accent-color-scope";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BRAND } from "@/config/brand";
import { useVertical } from "@/config/vertical-context";
import { AppointmentStatus } from "@/generated/prisma/enums";
import { STATUS_LABELS } from "@/lib/appointment-status";
import { formatMinutesDuration } from "@/lib/business-info";
import { buildAppointmentIcs } from "@/lib/ics";
import { buildGoogleMapsUrl } from "@/lib/maps";
import { getInitials } from "@/lib/text";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { describeFrequency } from "@/server/modules/appointment/series-rules";

import { RescheduleSection } from "./reschedule-section";
import type { ClientSeries, ManagedAppointment } from "./types";

function formatFullDateTime(dateISO: string, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(dateISO));
}

function formatShortDate(dateISO: string, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone, weekday: "short", day: "2-digit", month: "2-digit" })
    .format(new Date(dateISO))
    .replace(".", "")
    .replace(/^./, (letter) => letter.toUpperCase());
}

const CANCELLABLE_STATUSES: AppointmentStatus[] = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED];

/** Pedido de cancelamento de datas do horário fixo, aguardando a confirmação no modal. */
interface SeriesCancelRequest {
  targetId: string;
  scope: "one" | "following";
  startAt: string;
}

export function ManageView({
  token,
  appointment: initial,
  initialIsFuture,
  initialCanChange,
  series = null,
}: {
  token: string;
  appointment: ManagedAppointment;
  /**
   * Se o horário original já era futuro, calculado uma vez no servidor
   * (page.tsx) — recalcular com `Date.now()` durante a renderização no
   * cliente quebraria a paridade servidor/cliente na primeira hidratação.
   * As próprias mutações (cancelar/reagendar) sempre resultam em um status
   * não gerenciável ou num novo horário futuro, então não é preciso
   * reavaliar isso depois da carga inicial.
   */
  initialIsFuture: boolean;
  /** Fora do prazo de cancelamento do negócio? Calculado no servidor, pelo mesmo motivo acima. */
  initialCanChange: boolean;
  /** Horário fixo (agendamento recorrente), se este agendamento fizer parte de um. */
  series?: ClientSeries | null;
}) {
  const { terms } = useVertical();
  const [appointment, setAppointment] = useState(initial);
  const [isCancelling, setIsCancelling] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduledTo, setRescheduledTo] = useState<string | null>(null);
  const [seriesUpcoming, setSeriesUpcoming] = useState(series?.upcoming ?? []);
  const [seriesRequest, setSeriesRequest] = useState<SeriesCancelRequest | null>(null);
  const [cancellingSeries, setCancellingSeries] = useState(false);

  const { business } = appointment;
  const isOpen = CANCELLABLE_STATUSES.includes(appointment.status) && initialIsFuture;
  const canManage = isOpen && initialCanChange;
  const deadlineHours = business.cancellationDeadlineHours;
  const isCancelled = appointment.status === AppointmentStatus.CANCELLED;
  const timeLabel = (iso: string) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: business.timezone, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

  const icsHref = `data:text/calendar;charset=utf-8,${encodeURIComponent(
    buildAppointmentIcs({
      uid: `${appointment.id}@${BRAND.slug}`,
      startAt: new Date(appointment.startAt),
      endAt: new Date(appointment.endAt),
      summary: `${appointment.service.name} — ${business.name}`,
      description: `Agendamento com ${appointment.professional.name} em ${business.name}`,
      location: business.address ?? undefined,
    }),
  )}`;

  async function confirmSeriesCancel() {
    if (!seriesRequest) return;
    setError(null);
    setCancellingSeries(true);
    try {
      const response = await fetch(`/api/public/appointments/manage/${token}/series/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: seriesRequest.targetId, scope: seriesRequest.scope }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Não foi possível cancelar");
        return;
      }
      const cancelled = new Set<string>(data.cancelled as string[]);
      setSeriesUpcoming((current) => current.filter((occurrence) => !cancelled.has(occurrence.id)));
      // A própria data deste link foi junto: o status da tela acompanha.
      if (seriesUpcoming.some((o) => cancelled.has(o.id) && o.startAt === appointment.startAt)) {
        setAppointment((prev) => ({ ...prev, status: AppointmentStatus.CANCELLED }));
      }
      toast.success(cancelled.size === 1 ? "Data cancelada. O negócio foi avisado." : `${cancelled.size} datas canceladas. O negócio foi avisado.`);
      setSeriesRequest(null);
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setCancellingSeries(false);
    }
  }

  async function handleCancel() {
    setError(null);
    setIsCancelling(true);
    try {
      const response = await fetch(`/api/public/appointments/manage/${token}/cancel`, { method: "POST" });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Não foi possível cancelar");
        return;
      }
      setAppointment((prev) => ({ ...prev, status: AppointmentStatus.CANCELLED }));
      setConfirmCancelOpen(false);
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <AccentColorScope accentColor={business.accentColor} className="flex flex-1 flex-col">
      <header className="border-b bg-card p-4 shadow-sm">
        <div className="mx-auto flex w-full max-w-lg items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {business.logoUrl ? (
              <Avatar className="size-12">
                <AvatarImage src={business.logoUrl} alt="" />
                <AvatarFallback>{getInitials(business.name)}</AvatarFallback>
              </Avatar>
            ) : null}
            <div className="min-w-0">
              <p className="text-section-title font-bold">{business.name}</p>
              {business.address ? (
                <a
                  href={buildGoogleMapsUrl(business.address)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline"
                >
                  <MapPin className="size-3.5 shrink-0" aria-hidden />
                  {business.address}
                </a>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {business.whatsapp ? (
              <a
                href={buildWhatsAppUrl(business.whatsapp)}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <MessageCircle />
                WhatsApp
              </a>
            ) : null}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 p-4 sm:p-6">
        <div>
          <h1 className="text-page-title font-bold">Seu agendamento</h1>
          {/* Dentro do prazo o link não cancela nem remarca: a frase não pode prometer isso. */}
          {canManage ? (
            <p className="pt-1 text-sm">Seu horário está confirmado. Use esta página se precisar cancelar ou remarcar.</p>
          ) : isOpen ? (
            <p className="pt-1 text-sm">Seu horário está confirmado. Aqui estão os detalhes do atendimento.</p>
          ) : null}
        </div>

        {rescheduledTo ? (
          <p role="status" className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-sm">
            <CalendarCheck className="size-4 shrink-0 text-success" aria-hidden />
            <span>Horário alterado para {formatFullDateTime(rescheduledTo, business.timezone)}.</span>
          </p>
        ) : null}

        <dl className="flex flex-col gap-1 rounded-lg border bg-card p-4 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{terms.service.singular}</dt>
            <dd className="text-right font-medium">{appointment.service.name}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{terms.professional.singular}</dt>
            <dd className="text-right font-medium">{appointment.professional.name}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Data/hora</dt>
            <dd className="text-right font-medium first-letter:uppercase">
              {formatFullDateTime(appointment.startAt, business.timezone)}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-medium">{STATUS_LABELS[appointment.status]}</dd>
          </div>
        </dl>

        {isOpen ? (
          <a href={icsHref} download="agendamento.ics" className={buttonVariants({ variant: "outline", className: "w-full sm:w-fit" })}>
            <CalendarPlus />
            Adicionar ao calendário
          </a>
        ) : null}

        {canManage ? (
          <div className="flex flex-col gap-3">
            <section aria-labelledby="cancel-title" className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
              <div className="flex flex-col gap-1">
                <h2 id="cancel-title" className="font-medium">
                  Não vai poder ir?
                </h2>
                <p className="text-sm text-muted-foreground">Cancele aqui para liberar o horário. A equipe de {business.name} recebe o aviso na hora.</p>
              </div>
              <Button variant="destructive" className="w-full sm:w-fit" onClick={() => setConfirmCancelOpen(true)}>
                <CalendarX />
                Cancelar agendamento
              </Button>
            </section>

            <section aria-labelledby="reschedule-title" className="flex flex-col gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4">
              <div className="flex flex-col gap-1">
                <h2 id="reschedule-title" className="font-medium">
                  Precisa de outro horário?
                </h2>
                <p className="text-sm text-muted-foreground">Escolha um novo dia e horário. O atual fica livre para outra pessoa.</p>
              </div>
              <Button variant="outline" className="w-full bg-background sm:w-fit" onClick={() => setIsRescheduling((prev) => !prev)}>
                <CalendarClock />
                {isRescheduling ? "Fechar" : "Remarcar"}
              </Button>
              {isRescheduling ? (
                <RescheduleSection
                  token={token}
                  businessId={business.id}
                  serviceId={appointment.service.id}
                  professionalId={appointment.professional.id}
                  timezone={business.timezone}
                  maxWindowDays={business.maxBookingWindowDays}
                  onRescheduled={(newStartAt, newEndAt) => {
                    setAppointment((prev) => ({ ...prev, startAt: newStartAt, endAt: newEndAt }));
                    setRescheduledTo(newStartAt);
                    setIsRescheduling(false);
                    toast.success("Horário alterado. O negócio foi avisado.");
                  }}
                />
              ) : null}
            </section>
          </div>
        ) : null}

        {isCancelled ? (
          <section aria-labelledby="cancelled-title" className="flex flex-col gap-3 rounded-lg border bg-card p-4">
            <div className="flex flex-col gap-1">
              <h2 id="cancelled-title" className="font-medium">
                Agendamento cancelado
              </h2>
              <p className="text-sm text-muted-foreground">Este horário foi liberado. Quando quiser, é só reservar outro.</p>
            </div>
            <a href={`/${business.slug}`} className={buttonVariants({ className: "w-full sm:w-fit" })}>
              <CalendarPlus />
              Reservar outro horário
            </a>
          </section>
        ) : null}

        {series && seriesUpcoming.length > 0 ? (
          <section aria-labelledby="series-title" className="flex flex-col gap-3 rounded-lg border bg-card p-4">
            <div className="flex flex-col gap-1">
              <h2 id="series-title" className="flex items-center gap-2 font-medium">
                <Repeat className="size-4 text-primary" aria-hidden />
                Horário fixo
              </h2>
              <p className="text-sm text-muted-foreground">
                Este horário se repete {describeFrequency(series.frequencyWeeks)} às {timeLabel(appointment.startAt)}. Não pode ir num dia?
                Toque em “Não vou neste dia”: só aquela data é cancelada.
              </p>
            </div>
            <ul className="flex flex-col divide-y rounded-lg border text-sm">
              {seriesUpcoming.map((occurrence) => (
                <li key={occurrence.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span>{formatShortDate(occurrence.startAt, business.timezone)}</span>
                  {occurrence.canCancel ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSeriesRequest({ targetId: occurrence.id, scope: "one", startAt: occurrence.startAt })}
                    >
                      Não vou neste dia
                    </Button>
                  ) : (
                    <span className="text-caption text-muted-foreground">Perto demais: fale com o negócio</span>
                  )}
                </li>
              ))}
            </ul>
            {seriesUpcoming.some((o) => o.canCancel) ? (
              <Button
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => {
                  const first = seriesUpcoming.find((o) => o.canCancel)!;
                  setSeriesRequest({ targetId: first.id, scope: "following", startAt: first.startAt });
                }}
              >
                Cancelar todas as próximas
              </Button>
            ) : null}
          </section>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {isOpen && !canManage ? (
          <div role="status" className="flex flex-col gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm">
            <p>
              Alterações pelo link só até {formatMinutesDuration(deadlineHours * 60)} antes do horário. Para cancelar ou
              trocar, fale com {business.name}.
            </p>
            {business.whatsapp ? (
              <a
                href={buildWhatsAppUrl(
                  business.whatsapp,
                  `Olá! Preciso alterar meu agendamento de ${formatFullDateTime(appointment.startAt, business.timezone)}.`,
                )}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit bg-background" })}
              >
                <MessageCircle />
                Falar no WhatsApp
              </a>
            ) : null}
          </div>
        ) : null}

        {appointment.status === AppointmentStatus.COMPLETED ? (
          <section aria-labelledby="thanks-title" className="flex flex-col gap-3 rounded-lg border bg-card p-4">
            <div className="flex flex-col gap-1">
              <h2 id="thanks-title" className="font-medium">
                Obrigado pela visita!
              </h2>
              <p className="text-sm text-muted-foreground">Quando quiser voltar, reserve o próximo horário em poucos toques.</p>
            </div>
            <a href={`/${business.slug}`} className={buttonVariants({ className: "w-full sm:w-fit" })}>
              <CalendarPlus />
              Reservar de novo
            </a>
          </section>
        ) : null}
      </main>

      <footer className="px-4 pt-2 pb-6 text-center text-caption text-muted-foreground">
        {BRAND.poweredByLabel} {BRAND.name}
      </footer>

      <Dialog open={confirmCancelOpen} onOpenChange={(open) => !isCancelling && setConfirmCancelOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar este agendamento?</DialogTitle>
            <DialogDescription>
              {appointment.service.name} com {appointment.professional.name}, {formatFullDateTime(appointment.startAt, business.timezone)}.{" "}
              O horário fica livre para outra pessoa e não dá para desfazer.
            </DialogDescription>
          </DialogHeader>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button variant="outline" disabled={isCancelling} onClick={() => setConfirmCancelOpen(false)}>
              Voltar
            </Button>
            <Button variant="destructive" disabled={isCancelling} onClick={() => void handleCancel()}>
              {isCancelling ? "Cancelando..." : "Sim, cancelar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={seriesRequest != null} onOpenChange={(open) => !open && !cancellingSeries && setSeriesRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{seriesRequest?.scope === "one" ? "Cancelar só esta data?" : "Cancelar todas as próximas datas?"}</DialogTitle>
            <DialogDescription>
              {seriesRequest
                ? seriesRequest.scope === "one"
                  ? `${formatShortDate(seriesRequest.startAt, business.timezone)} às ${timeLabel(seriesRequest.startAt)}. As outras datas do horário fixo continuam marcadas.`
                  : `De ${formatShortDate(seriesRequest.startAt, business.timezone)} em diante, todas as datas do horário fixo são canceladas. Não dá para desfazer.`
                : null}
            </DialogDescription>
          </DialogHeader>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button variant="outline" disabled={cancellingSeries} onClick={() => setSeriesRequest(null)}>
              Voltar
            </Button>
            <Button variant="destructive" disabled={cancellingSeries} onClick={() => void confirmSeriesCancel()}>
              {cancellingSeries ? "Cancelando..." : "Sim, cancelar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AccentColorScope>
  );
}
