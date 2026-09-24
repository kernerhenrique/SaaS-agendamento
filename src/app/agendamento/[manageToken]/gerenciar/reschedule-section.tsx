"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
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
  onRescheduled,
}: {
  token: string;
  businessId: string;
  serviceId: string;
  professionalId: string;
  timezone: string;
  onRescheduled: (newStartAt: string, newEndAt: string) => void;
}) {
  const [date, setDate] = useState(() => todayInTimeZone(timezone));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    const params = new URLSearchParams({ businessId, serviceId, professionalId, date });
    fetch(`/api/availability?${params.toString()}`)
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setSlots(data.slots ?? []);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [businessId, serviceId, professionalId, date]);

  async function handlePick(slot: Slot) {
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/public/appointments/manage/${token}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startAt: slot.startAt }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "Não foi possível reagendar");
        return;
      }
      onRescheduled(data.appointment.startAt, data.appointment.endAt);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setDate((d) => addDaysToIsoDate(d, -1))}>
          ←
        </Button>
        <p className="min-w-40 text-center text-sm font-medium capitalize">
          {formatDateLabel(date, timezone)}
        </p>
        <Button variant="outline" size="sm" onClick={() => setDate((d) => addDaysToIsoDate(d, 1))}>
          →
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando horários...</p>
      ) : slots.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum horário disponível neste dia.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map((slot) => (
            <button
              key={slot.startAt}
              type="button"
              disabled={isSubmitting}
              className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              onClick={() => handlePick(slot)}
            >
              {new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, hour: "2-digit", minute: "2-digit" }).format(
                new Date(slot.startAt),
              )}
            </button>
          ))}
        </div>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
