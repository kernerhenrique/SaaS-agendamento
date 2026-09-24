"use client";

import { useState } from "react";

import { AppointmentStatus } from "@/generated/prisma/enums";
import { STATUS_LABELS } from "@/lib/appointment-status";

import { RescheduleSection } from "./reschedule-section";
import { ReviewForm } from "./review-form";
import type { ManagedAppointment } from "./types";

function formatFullDateTime(dateISO: string, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(dateISO));
}

const CANCELLABLE_STATUSES: AppointmentStatus[] = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED];

export function ManageView({ token, appointment: initial }: { token: string; appointment: ManagedAppointment }) {
  const [appointment, setAppointment] = useState(initial);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);

  const isFuture = new Date(appointment.startAt).getTime() > Date.now();
  const canManage = CANCELLABLE_STATUSES.includes(appointment.status) && isFuture;

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
          <dt className="text-muted-foreground">Serviço</dt>
          <dd className="font-medium">{appointment.service.name}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Profissional</dt>
          <dd className="font-medium">{appointment.professional.name}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Data/hora</dt>
          <dd className="text-right font-medium capitalize">
            {formatFullDateTime(appointment.startAt, appointment.business.timezone)}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Status</dt>
          <dd className="font-medium">{STATUS_LABELS[appointment.status]}</dd>
        </div>
      </dl>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {canManage ? (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              disabled={isCancelling}
              onClick={handleCancel}
            >
              {isCancelling ? "Cancelando..." : "Cancelar agendamento"}
            </button>
            <button
              type="button"
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
              onClick={() => setIsRescheduling((prev) => !prev)}
            >
              {isRescheduling ? "Fechar" : "Reagendar"}
            </button>
          </div>

          {isRescheduling ? (
            <RescheduleSection
              token={token}
              businessId={appointment.business.id}
              serviceId={appointment.service.id}
              professionalId={appointment.professional.id}
              timezone={appointment.business.timezone}
              onRescheduled={(newStartAt, newEndAt) => {
                setAppointment((prev) => ({ ...prev, startAt: newStartAt, endAt: newEndAt }));
                setIsRescheduling(false);
              }}
            />
          ) : null}
        </div>
      ) : null}

      {appointment.status === AppointmentStatus.COMPLETED ? (
        appointment.review ? (
          <div className="rounded-lg border p-4 text-sm">
            <p className="font-medium">Sua avaliação</p>
            <p>{"★".repeat(appointment.review.rating)}</p>
            {appointment.review.comment ? <p className="text-muted-foreground">{appointment.review.comment}</p> : null}
          </div>
        ) : (
          <ReviewForm
            token={token}
            onSubmitted={(review) => setAppointment((prev) => ({ ...prev, review }))}
          />
        )
      ) : null}
    </main>
  );
}
