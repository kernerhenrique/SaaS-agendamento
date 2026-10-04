"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { SlotGridSkeleton } from "@/components/slot-grid-skeleton";
import { addDaysToIsoDate, formatDateLabel, todayInTimeZone } from "@/lib/date";

interface Slot {
  startAt: string;
  endAt: string;
}

export function RescheduleSection({
  token,
  businessId,
  serviceId,
  professionalId,
  timezone,
  maxWindowDays,
  onRescheduled,
}: {
  token: string;
  businessId: string;
  serviceId: string;
  professionalId: string;
  timezone: string;
  /** Janela de reserva do negócio (hoje + N dias): além dela não há horário. */
  maxWindowDays: number;
  onRescheduled: (newStartAt: string, newEndAt: string) => void;
}) {
  const [today] = useState(() => todayInTimeZone(timezone));
  const lastDate = addDaysToIsoDate(today, maxWindowDays);
  const [date, setDate] = useState(today);
  // Resultado marcado com o dia: ao trocar de dia, a grade anterior some na hora.
  const [result, setResult] = useState<{ date: string; slots: Slot[] } | null>(null);
  const isLoading = result?.date !== date;
  const slots = isLoading ? [] : result.slots;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Slot | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ businessId, serviceId, professionalId, date });
    fetch(`/api/availability?${params.toString()}`)
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setResult({ date, slots: data.slots ?? [] });
      })
      .catch(() => {
        if (!cancelled) setResult({ date, slots: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [businessId, serviceId, professionalId, date]);

  // O toque só escolhe; remarcar de fato pede confirmação (um toque errado não muda o horário).
  async function confirmPick() {
    if (!pending) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/public/appointments/manage/${token}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startAt: pending.startAt }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Não foi possível remarcar");
        return;
      }
      onRescheduled(data.appointment.startAt, data.appointment.endAt);
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const formatTime = (iso: string) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

  if (pending) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border bg-background p-4" role="group" aria-labelledby="reschedule-confirm-title">
        <p id="reschedule-confirm-title" className="text-sm">
          Remarcar para <strong className="font-semibold">{formatDateLabel(date, timezone)}, às {formatTime(pending.startAt)}</strong>?
        </p>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button disabled={isSubmitting} onClick={() => void confirmPick()}>
            {isSubmitting ? "Remarcando..." : "Confirmar remarcação"}
          </Button>
          <Button variant="outline" disabled={isSubmitting} onClick={() => { setPending(null); setError(null); }}>
            Escolher outro horário
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          aria-label="Dia anterior"
          disabled={date <= today}
          onClick={() => setDate((d) => addDaysToIsoDate(d, -1))}
        >
          ←
        </Button>
        <p className="min-w-40 text-center text-sm font-medium first-letter:uppercase">
          {formatDateLabel(date, timezone)}
        </p>
        <Button
          variant="outline"
          size="sm"
          aria-label="Próximo dia"
          disabled={date >= lastDate}
          onClick={() => setDate((d) => addDaysToIsoDate(d, 1))}
        >
          →
        </Button>
      </div>

      {isLoading ? (
        <SlotGridSkeleton />
      ) : slots.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum horário disponível neste dia.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map((slot) => (
            <button
              key={slot.startAt}
              type="button"
              className="min-h-11 rounded-lg border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
              onClick={() => setPending(slot)}
            >
              {formatTime(slot.startAt)}
            </button>
          ))}
        </div>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
