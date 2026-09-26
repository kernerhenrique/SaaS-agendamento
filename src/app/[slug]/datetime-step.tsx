"use client";

import { useEffect, useState } from "react";
import { Loader2, SparklesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DateStrip } from "@/components/date-strip";
import { SlotGridSkeleton } from "@/components/slot-grid-skeleton";
import { TimeSlotGrid, type TimeSlot } from "@/components/time-slot-grid";
import { formatDateLabel, todayInTimeZone, utcToLocalMinutes } from "@/lib/date";

import { NO_PREFERENCE, type AvailableSlot } from "./types";

function formatTime(dateISO: string, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone, hour: "2-digit", minute: "2-digit" }).format(
    new Date(dateISO),
  );
}

const MAX_DAYS_TO_PROBE = 30;

async function fetchSlotsForDate(params: {
  businessId: string;
  serviceId: string;
  professionalId: string | typeof NO_PREFERENCE;
  date: string;
}): Promise<AvailableSlot[]> {
  const query = new URLSearchParams({
    businessId: params.businessId,
    serviceId: params.serviceId,
    date: params.date,
  });
  if (params.professionalId !== NO_PREFERENCE) {
    query.set("professionalId", params.professionalId);
  }
  const response = await fetch(`/api/availability?${query.toString()}`);
  const data = await response.json();
  return data.slots ?? [];
}

export function DatetimeStep({
  businessId,
  serviceId,
  professionalId,
  timezone,
  onSelect,
}: {
  businessId: string;
  serviceId: string;
  professionalId: string | typeof NO_PREFERENCE;
  timezone: string;
  onSelect: (slot: AvailableSlot) => void;
}) {
  const [today] = useState(() => todayInTimeZone(timezone));
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearchingNext, setIsSearchingNext] = useState(false);
  const [searchNextError, setSearchNextError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Reinicia o estado de carregamento a cada busca; padrão de efeito de
    // fetch com flag de loading e cancelamento de corrida, não um bug.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);

    fetchSlotsForDate({ businessId, serviceId, professionalId, date })
      .then((result) => {
        if (!cancelled) setSlots(result);
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
  const timeSlots: TimeSlot[] = displaySlots.map((slot) => ({
    key: slot.startAt,
    label: formatTime(slot.startAt, timezone),
    minutesFromMidnight: utcToLocalMinutes(new Date(slot.startAt), timezone),
  }));

  async function handleFindNextAvailable() {
    setIsSearchingNext(true);
    setSearchNextError(null);
    try {
      for (let offset = 1; offset <= MAX_DAYS_TO_PROBE; offset++) {
        const candidateDate = new Date(date);
        candidateDate.setDate(candidateDate.getDate() + offset);
        const candidateISO = candidateDate.toISOString().slice(0, 10);

        const candidateSlots = await fetchSlotsForDate({
          businessId,
          serviceId,
          professionalId,
          date: candidateISO,
        });
        if (candidateSlots.length > 0) {
          setDate(candidateISO);
          return;
        }
      }
      setSearchNextError(`Nenhum horário livre nos próximos ${MAX_DAYS_TO_PROBE} dias.`);
    } finally {
      setIsSearchingNext(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Escolha data e horário</h2>

      <DateStrip minDate={today} selectedDate={date} timezone={timezone} onSelect={setDate} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium first-letter:uppercase">{formatDateLabel(date, timezone)}</p>
        <Button variant="outline" size="sm" onClick={handleFindNextAvailable} disabled={isSearchingNext}>
          {isSearchingNext ? <Loader2 className="animate-spin" /> : <SparklesIcon />}
          Próximo horário disponível
        </Button>
      </div>
      {searchNextError ? <p className="text-sm text-muted-foreground">{searchNextError}</p> : null}

      {isLoading ? <SlotGridSkeleton /> : <TimeSlotGrid slots={timeSlots} onSelect={(slot) => onSelect(uniqueSlotsByTime.get(slot.key)!)} />}
    </div>
  );
}
