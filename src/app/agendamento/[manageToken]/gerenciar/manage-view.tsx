"use client";

import { useState } from "react";
import { CalendarPlus, CircleCheck, MessageCircle } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { useVertical } from "@/config/vertical-context";
import { AppointmentStatus } from "@/generated/prisma/enums";
import { STATUS_LABELS } from "@/lib/appointment-status";
import { formatMinutesDuration } from "@/lib/business-info";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

import { RescheduleSection } from "./reschedule-section";
import type { ManagedAppointment } from "./types";

function formatFullDateTime(dateISO: string, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(dateISO));
}

const CANCELLABLE_STATUSES: AppointmentStatus[] = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED];

export function ManageView({
  token,
  appointment: initial,
  initialIsFuture,
  initialCanChange,
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
}) {
  const { terms } = useVertical();
  const [appointment, setAppointment] = useState(initial);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [justConfirmed, setJustConfirmed] = useState(false);

  const isOpen = CANCELLABLE_STATUSES.includes(appointment.status) && initialIsFuture;
  const needsConfirmation = appointment.status === AppointmentStatus.PENDING && initialIsFuture;

  async function handleConfirm() {
    setError(null);
    setIsConfirming(true);
    try {
      const response = await fetch(`/api/public/appointments/manage/${token}/confirm`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "Não foi possível confirmar");
        return;
      }
      setAppointment((prev) => ({ ...prev, status: AppointmentStatus.CONFIRMED }));
      setJustConfirmed(true);
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setIsConfirming(false);
    }
  }
  const canManage = isOpen && initialCanChange;
  const deadlineHours = appointment.business.cancellationDeadlineHours;

  async function handleCancel() {
    if (!window.confirm("Tem certeza que deseja cancelar este agendamento?")) return;
    setError(null);
    setIsCancelling(true);
    try {
      const response = await fetch(`/api/public/appointments/manage/${token}/cancel`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "Não foi possível cancelar");
        return;
      }
      setAppointment((prev) => ({ ...prev, status: AppointmentStatus.CANCELLED }));
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Seu agendamento</h1>
        <p className="text-sm text-muted-foreground">{appointment.business.name}</p>
      </div>

      <dl className="flex flex-col gap-1 rounded-lg border p-4 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{terms.service.singular}</dt>
          <dd className="font-medium">{appointment.service.name}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{terms.professional.singular}</dt>
          <dd className="font-medium">{appointment.professional.name}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Data/hora</dt>
          <dd className="text-right font-medium first-letter:uppercase">
            {formatFullDateTime(appointment.startAt, appointment.business.timezone)}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Status</dt>
          <dd className="font-medium">{STATUS_LABELS[appointment.status]}</dd>
        </div>
      </dl>

      {needsConfirmation ? (
        <section aria-labelledby="confirm-title" className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/10 p-4">
          <div className="flex flex-col gap-1">
            <h2 id="confirm-title" className="font-medium">
              Confirme sua presença
            </h2>
            <p className="text-sm text-muted-foreground">
              Seu horário está reservado. Confirmar avisa {appointment.business.name} que você vai: leva um toque.
            </p>
          </div>
          <Button className="w-full sm:w-fit" disabled={isConfirming} onClick={handleConfirm}>
            <CircleCheck />
            {isConfirming ? "Confirmando..." : "Confirmar presença"}
          </Button>
        </section>
      ) : null}

      {justConfirmed ? (
        <p role="status" className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-4 text-sm">
          <CircleCheck className="size-4 shrink-0 text-success" aria-hidden />
          Presença confirmada: já aparece na agenda de {appointment.business.name}. Até lá!
        </p>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {canManage ? (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Button variant="outline" disabled={isCancelling} onClick={handleCancel}>
              {isCancelling ? "Cancelando..." : "Cancelar agendamento"}
            </Button>
            <Button variant="outline" onClick={() => setIsRescheduling((prev) => !prev)}>
              {isRescheduling ? "Fechar" : "Reagendar"}
            </Button>
          </div>

          {isRescheduling ? (
            <RescheduleSection
              token={token}
              businessId={appointment.business.id}
              serviceId={appointment.service.id}
              professionalId={appointment.professional.id}
              timezone={appointment.business.timezone}
              maxWindowDays={appointment.business.maxBookingWindowDays}
              onRescheduled={(newStartAt, newEndAt) => {
                setAppointment((prev) => ({ ...prev, startAt: newStartAt, endAt: newEndAt }));
                setIsRescheduling(false);
              }}
            />
          ) : null}
        </div>
      ) : null}

      {isOpen && !canManage ? (
        <div role="status" className="flex flex-col gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm">
          <p>
            Alterações pelo link só até {formatMinutesDuration(deadlineHours * 60)} antes do horário. Para cancelar ou
            trocar, fale com {appointment.business.name}.
          </p>
          {appointment.business.whatsapp ? (
            <a
              href={buildWhatsAppUrl(
                appointment.business.whatsapp,
                `Olá! Preciso alterar meu agendamento de ${formatFullDateTime(appointment.startAt, appointment.business.timezone)}.`,
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
        <section aria-labelledby="thanks-title" className="flex flex-col gap-3 rounded-lg border p-4">
          <div className="flex flex-col gap-1">
            <h2 id="thanks-title" className="font-medium">
              Obrigado pela visita!
            </h2>
            <p className="text-sm text-muted-foreground">Quando quiser voltar, reserve o próximo horário em poucos toques.</p>
          </div>
          <a href={`/${appointment.business.slug}`} className={buttonVariants({ className: "w-full sm:w-fit" })}>
            <CalendarPlus />
            Reservar de novo
          </a>
        </section>
      ) : null}
    </main>
  );
}
