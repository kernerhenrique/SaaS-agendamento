"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CalendarClock, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { DetailDrawerContent } from "@/components/detail-drawer";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { lowerTerm } from "@/config/vertical";
import { useVertical } from "@/config/vertical-context";
import type { AppointmentStatus } from "@/generated/prisma/enums";
import { NEXT_STATUS_ACTIONS, STATUS_LABELS, STATUS_TONE } from "@/lib/appointment-status";
import { localMinutesToUtc, utcToLocalDate, utcToLocalMinutes } from "@/lib/date";
import { formatPhoneBR } from "@/lib/phone";
import { minutesToTimeInput, timeInputToMinutes } from "@/lib/weekday";
import { BookingTimeNotice, useNow } from "@/components/admin/booking-time-notice";
import { WhatsAppMessageMenu } from "@/components/admin/whatsapp-message-menu";
import { evaluateLocalSlot } from "@/server/modules/appointment/admin-booking-rules";
import { RESCHEDULABLE_STATUSES } from "@/server/modules/appointment/reschedule-rules";

import { AppointmentPayments } from "./appointment-payments";

import type { ProfessionalOption } from "./types";

interface AppointmentDetail {
  appointment: {
    id: string;
    status: AppointmentStatus;
    startAt: string;
    endAt: string;
    notes: string | null;
    professional: { id: string; name: string };
    service: { id: string; name: string; durationMin: number; priceCents: number };
    client: { id: string; name: string; phone: string; email: string | null };
  };
  history: { id: string; startAt: string; status: AppointmentStatus; service: { name: string } }[];
  clientStats: { completed: number; noShows: number };
  /** Quem marcou / cancelou pelo painel (null quando não há registro). */
  audit: { createdBy: Actor | null; cancelledBy: Actor | null };
}

interface Actor {
  name: string;
  role: "OWNER" | "PROFESSIONAL";
}

/**
 * Detalhe do agendamento em gaveta lateral (regra do design system: detalhe de
 * registro abre em drawer). Recarrega do servidor a cada abertura/alteração.
 */
export function AppointmentDrawer({
  appointmentId,
  timezone,
  professionals,
  onClose,
  onChanged,
}: {
  appointmentId: string | null;
  timezone: string;
  professionals: ProfessionalOption[];
  onClose: () => void;
  onChanged: () => void;
}) {
  return (
    <Sheet open={appointmentId != null} onOpenChange={(open) => !open && onClose()}>
      {appointmentId ? (
        <DrawerBody
          key={appointmentId}
          appointmentId={appointmentId}
          timezone={timezone}
          professionals={professionals}
          onChanged={onChanged}
        />
      ) : null}
    </Sheet>
  );
}

function DrawerBody({
  appointmentId,
  timezone,
  professionals,
  onChanged,
}: {
  appointmentId: string;
  timezone: string;
  professionals: ProfessionalOption[];
  onChanged: () => void;
}) {
  const { terms } = useVertical();
  const [detail, setDetail] = useState<AppointmentDetail | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingStatus, setPendingStatus] = useState<AppointmentStatus | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);
  /** "Concluir" abre o recebimento já preenchido (com "Só concluir"). */
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/appointments/${appointmentId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: AppointmentDetail) => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [appointmentId, reloadKey]);

  const formatDateTime = (iso: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, ...options }).format(new Date(iso));

  async function changeStatus(status: AppointmentStatus) {
    setPendingStatus(status);
    try {
      const response = await fetch(`/api/admin/appointments/${appointmentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.error ?? "Não foi possível atualizar o status");
        return;
      }
      toast.success(`Status: ${STATUS_LABELS[status]}`);
      setReloadKey((k) => k + 1);
      onChanged();
    } finally {
      setPendingStatus(null);
    }
  }

  if (loadError) {
    return (
      <DetailDrawerContent title="Agendamento">
        <p className="py-4 text-sm text-destructive">Não foi possível carregar este agendamento.</p>
        <Button variant="outline" size="sm" onClick={() => { setLoadError(false); setReloadKey((k) => k + 1); }}>
          <RotateCcw />
          Tentar de novo
        </Button>
      </DetailDrawerContent>
    );
  }

  if (!detail) {
    return (
      <DetailDrawerContent title="Carregando…">
        <div className="flex flex-col gap-3 py-2" aria-busy>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </DetailDrawerContent>
    );
  }

  const { appointment, history, clientStats, audit } = detail;
  const actorLabel = (actor: Actor) =>
    `${actor.name} (${actor.role === "OWNER" ? "dono" : lowerTerm(terms.professional.singular)})`;
  const actions = NEXT_STATUS_ACTIONS[appointment.status];
  const canReschedule = RESCHEDULABLE_STATUSES.includes(appointment.status);
  const whenLabel = `${formatDateTime(appointment.startAt, { weekday: "long", day: "2-digit", month: "long" })}, ${formatDateTime(appointment.startAt, { hour: "2-digit", minute: "2-digit" })}–${formatDateTime(appointment.endAt, { hour: "2-digit", minute: "2-digit" })}`;

  return (
    <DetailDrawerContent
      title={appointment.service.name}
      description={whenLabel.charAt(0).toUpperCase() + whenLabel.slice(1)}
      footer={
        actions.length > 0 || canReschedule ? (
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Button
                key={action.status}
                variant={action.status === "CANCELLED" || action.status === "NO_SHOW" ? "outline" : "default"}
                size="sm"
                disabled={pendingStatus != null || (action.status === "COMPLETED" && isCompleting)}
                onClick={() => {
                  // Cancelar é estado final: passa por confirmação (modal curto).
                  if (action.status === "CANCELLED") setIsConfirmingCancel(true);
                  // Concluir abre o "Concluir e receber" na seção Pagamento.
                  else if (action.status === "COMPLETED") {
                    setIsRescheduling(false);
                    setIsCompleting(true);
                  } else void changeStatus(action.status);
                }}
              >
                {pendingStatus === action.status ? "Salvando…" : action.label}
              </Button>
            ))}
            {canReschedule ? (
              <Button variant="outline" size="sm" onClick={() => setIsRescheduling((v) => !v)}>
                <CalendarClock />
                {isRescheduling ? "Fechar remarcação" : "Remarcar"}
              </Button>
            ) : null}
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-5 py-2 text-sm">
        <div className="flex flex-col items-start gap-1.5">
          <StatusBadge tone={STATUS_TONE[appointment.status]}>{STATUS_LABELS[appointment.status]}</StatusBadge>
          {audit.createdBy || audit.cancelledBy ? (
            <p className="text-caption text-muted-foreground">
              {audit.createdBy ? `Marcado por ${actorLabel(audit.createdBy)}` : null}
              {audit.createdBy && audit.cancelledBy ? " · " : null}
              {audit.cancelledBy ? `Cancelado por ${actorLabel(audit.cancelledBy)}` : null}
            </p>
          ) : null}
        </div>

        {isRescheduling ? (
          <RescheduleForm
            appointmentId={appointment.id}
            serviceId={appointment.service.id}
            durationMin={appointment.service.durationMin}
            currentProfessionalId={appointment.professional.id}
            startAt={appointment.startAt}
            timezone={timezone}
            professionals={professionals}
            onDone={() => {
              setIsRescheduling(false);
              setReloadKey((k) => k + 1);
              onChanged();
            }}
          />
        ) : null}

        <AppointmentPayments
          appointmentId={appointment.id}
          timezone={timezone}
          reloadKey={reloadKey}
          completing={isCompleting}
          onCompletingChange={setIsCompleting}
          onChanged={() => {
            setReloadKey((k) => k + 1);
            onChanged();
          }}
        />

        <section className="flex flex-col gap-1">
          <h3 className="text-caption font-medium text-muted-foreground uppercase">{terms.client.singular}</h3>
          <p className="font-medium">{appointment.client.name}</p>
          <p className="text-muted-foreground">{formatPhoneBR(appointment.client.phone)}</p>
          {appointment.client.email ? <p className="text-muted-foreground">{appointment.client.email}</p> : null}
          <p className="text-caption text-muted-foreground">
            {clientStats.completed} {clientStats.completed === 1 ? "atendimento concluído" : "atendimentos concluídos"} ·{" "}
            {clientStats.noShows} {clientStats.noShows === 1 ? "falta" : "faltas"}
          </p>
          <div className="mt-1">
            <WhatsAppMessageMenu appointmentId={appointment.id} phone={appointment.client.phone} timezone={timezone} />
          </div>
        </section>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-muted-foreground">{terms.professional.singular}</dt>
          <dd className="font-medium">{appointment.professional.name}</dd>
          <dt className="text-muted-foreground">Duração</dt>
          <dd>{appointment.service.durationMin} min</dd>
          {appointment.notes ? (
            <>
              <dt className="text-muted-foreground">Observação</dt>
              <dd>{appointment.notes}</dd>
            </>
          ) : null}
        </dl>

        <section className="flex flex-col gap-2">
          <h3 className="text-caption font-medium text-muted-foreground uppercase">Histórico</h3>
          {history.length === 0 ? (
            <p className="text-muted-foreground">Primeira visita.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {history.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">
                    {formatDateTime(item.startAt, { day: "2-digit", month: "2-digit", year: "2-digit" })} · {item.service.name}
                  </span>
                  <StatusBadge tone={STATUS_TONE[item.status]}>{STATUS_LABELS[item.status]}</StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Dialog open={isConfirmingCancel} onOpenChange={setIsConfirmingCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar agendamento?</DialogTitle>
            <DialogDescription>
              {appointment.client.name} · {whenLabel}. Não dá para desfazer; para voltar, será preciso criar um novo
              agendamento.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmingCancel(false)}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              disabled={pendingStatus != null}
              onClick={async () => {
                await changeStatus("CANCELLED");
                setIsConfirmingCancel(false);
              }}
            >
              {pendingStatus === "CANCELLED" ? "Cancelando…" : "Cancelar agendamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DetailDrawerContent>
  );
}

function RescheduleForm({
  appointmentId,
  serviceId,
  durationMin,
  currentProfessionalId,
  startAt,
  timezone,
  professionals,
  onDone,
}: {
  appointmentId: string;
  serviceId: string;
  durationMin: number;
  currentProfessionalId: string;
  startAt: string;
  timezone: string;
  professionals: ProfessionalOption[];
  onDone: () => void;
}) {
  const { terms } = useVertical();
  const eligible = professionals.filter((p) => p.services.some((s) => s.id === serviceId));
  const [date, setDate] = useState(() => utcToLocalDate(new Date(startAt), timezone));
  const [time, setTime] = useState(() => minutesToTimeInput(utcToLocalMinutes(new Date(startAt), timezone)));
  const [professionalId, setProfessionalId] = useState(currentProfessionalId);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const now = useNow();
  const selected = eligible.find((p) => p.id === professionalId);
  const startMinute = timeInputToMinutes(time);
  const slot =
    selected && date && startMinute !== null
      ? evaluateLocalSlot({ date, startMinute, durationMin, timeZone: timezone, now, weeklyHours: selected.workingHours })
      : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const minutes = timeInputToMinutes(time);
    if (!date || minutes === null) {
      setError("Informe data e horário");
      return;
    }
    if (slot?.isPast) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startAt: localMinutesToUtc(date, minutes, timezone).toISOString(),
          professionalId,
          allowOutsideHours: slot?.isOutsideHours ?? false,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "Não foi possível remarcar");
        return;
      }
      toast.success("Agendamento remarcado.");
      onDone();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rs-date">Data</Label>
          <Input id="rs-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rs-time">Horário</Label>
          <Input id="rs-time" type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} required />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rs-professional">{terms.professional.singular}</Label>
        <Select value={professionalId} onValueChange={(value) => setProfessionalId(value ?? currentProfessionalId)}>
          <SelectTrigger id="rs-professional">
            <SelectValue>{(value: string) => eligible.find((p) => p.id === value)?.name ?? ""}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {eligible.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {slot && selected ? (
        <BookingTimeNotice
          professionalName={selected.name}
          isPast={slot.isPast}
          isOutsideHours={slot.isOutsideHours}
          workingHours={slot.workingHours}
        />
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="sm" disabled={isSubmitting || slot?.isPast} className="self-start">
        {isSubmitting ? "Salvando…" : slot?.isOutsideHours && !slot.isPast ? "Remarcar mesmo assim" : "Confirmar novo horário"}
      </Button>
    </form>
  );
}
