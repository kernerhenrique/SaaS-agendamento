"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { addDaysToIsoDate, formatDateLabel, todayInTimeZone } from "@/lib/date";

import { NO_PREFERENCE, type AvailableSlot } from "./types";

function formatTime(dateISO: string, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone, hour: "2-digit", minute: "2-digit" }).format(
    new Date(dateISO),
  );
}

export function DatetimeStep({
  businessId,
  serviceId,
  professionalId,
  timezone,
  accentColor,
  onSelect,
}: {
  businessId: string;
  serviceId: string;
  professionalId: string | typeof NO_PREFERENCE;
  timezone: string;
  accentColor: string;
  onSelect: (slot: AvailableSlot) => void;
}) {
  const [date, setDate] = useState(() => todayInTimeZone(timezone));
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const params = new URLSearchParams({ businessId, serviceId, date });
    if (professionalId !== NO_PREFERENCE) {
      params.set("professionalId", professionalId);
    }

    fetch(`/api/availability?${params.toString()}`)
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return;
        setSlots(data.slots ?? []);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [businessId, serviceId, professionalId, date]);

  // Um horário pode aparecer mais de uma vez (um por profissional livre,
  // no caso de "sem preferência"). Mostramos um botão por horário único;
  // o primeiro profissional disponível naquele horário é quem assume.
  const uniqueSlotsByTime = new Map<string, AvailableSlot>();
  for (const slot of slots) {
    if (!uniqueSlotsByTime.has(slot.startAt)) {
      uniqueSlotsByTime.set(slot.startAt, slot);
    }
  }
  const displaySlots = Array.from(uniqueSlotsByTime.values());

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">Escolha data e horário</h2>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setDate((d) => addDaysToIsoDate(d, -1))}>
          ←
        </Button>
        <p className="min-w-48 text-center text-sm font-medium capitalize">
          {formatDateLabel(date, timezone)}
        </p>
        <Button variant="outline" size="sm" onClick={() => setDate((d) => addDaysToIsoDate(d, 1))}>
          →
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando horários...</p>
      ) : displaySlots.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum horário disponível neste dia. Tente outra data.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {displaySlots.map((slot) => (
            <button
              key={slot.startAt}
              type="button"
              className="rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--accent)] hover:text-white focus-visible:bg-[var(--accent)] focus-visible:text-white"
              style={{ borderColor: accentColor, ["--accent" as string]: accentColor }}
              onClick={() => onSelect(slot)}
            >
              {formatTime(slot.startAt, timezone)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
