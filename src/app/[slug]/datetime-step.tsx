"use client";

import { useEffect, useState } from "react";
import { CalendarOff, Loader2, SparklesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DateStrip } from "@/components/date-strip";
import { SlotGridSkeleton } from "@/components/slot-grid-skeleton";
import { TimeSlotGrid, type TimeSlot } from "@/components/time-slot-grid";
import { addDaysToIsoDate, formatDateLabel, todayInTimeZone, utcToLocalMinutes } from "@/lib/date";
import { findClosure, type ClosureRange } from "@/server/modules/business/closure-rules";

import { NO_PREFERENCE, type AvailableSlot } from "./types";

function formatTime(dateISO: string, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone, hour: "2-digit", minute: "2-digit" }).format(
    new Date(dateISO),
  );
}

const MAX_DAYS_TO_PROBE = 30;

/** "YYYY-MM-DD" → "02/11" (data de calendário, sem fuso). */
function formatShortDate(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return `${day}/${month}`;
}

async function fetchSlotsForDate(params: {
  businessId: string;
  serviceId: string;
  professionalId: string | typeof NO_PREFERENCE;
  date: string;
  /** Também os horários ocupados (para exibir desabilitados na grade). */
  includeOccupied?: boolean;
}): Promise<{ slots: AvailableSlot[]; occupied: string[] }> {
  const query = new URLSearchParams({
    businessId: params.businessId,
    serviceId: params.serviceId,
    date: params.date,
  });
  if (params.includeOccupied) query.set("ocupados", "1");
  if (params.professionalId !== NO_PREFERENCE) {
    query.set("professionalId", params.professionalId);
  }
  const response = await fetch(`/api/availability?${query.toString()}`);
  const data = await response.json();
  return { slots: data.slots ?? [], occupied: data.occupied ?? [] };
}

export function DatetimeStep({
  businessId,
  serviceId,
  professionalId,
  timezone,
  maxWindowDays,
  closures,
  initialDate = null,
  notice = null,
  onDateChange,
  onSelect,
}: {
  businessId: string;
  serviceId: string;
  professionalId: string | typeof NO_PREFERENCE;
  timezone: string;
  /** Janela de reserva do negócio: hoje + N dias, inclusive (mesma regra do servidor). */
  maxWindowDays: number;
  /** Dias fechados do negócio (riscados na faixa; o dia fechado mostra o motivo no lugar da grade). */
  closures: ClosureRange[];
  /** Dia já escolhido antes (o "Voltar" do passo dos dados reabre nele, não em hoje). */
  initialDate?: string | null;
  /** Aviso no topo da grade (ex.: o horário escolhido acabou de ser reservado por outra pessoa). */
  notice?: string | null;
  onDateChange?: (date: string) => void;
  onSelect: (slot: AvailableSlot) => void;
}) {
  const [today] = useState(() => todayInTimeZone(timezone));
  const lastDate = addDaysToIsoDate(today, maxWindowDays);
  const [date, setDateState] = useState(() =>
    initialDate && initialDate >= today && initialDate <= lastDate ? initialDate : today,
  );
  function setDate(next: string) {
    setDateState(next);
    onDateChange?.(next);
  }
  const closedReason = findClosure(date, closures)?.reason ?? null;
  // O resultado guarda a qual dia ele pertence: ao trocar de dia, a grade
  // anterior some na hora (nada de tocar num horário do dia errado enquanto
  // o novo carrega).
  const requestKey = `${serviceId}|${professionalId}|${date}`;
  const [result, setResult] = useState<{ key: string; slots: AvailableSlot[]; occupied: string[] } | null>(null);
  const isLoading = result?.key !== requestKey;
  const slots = isLoading ? [] : result.slots;
  const occupied = isLoading ? [] : result.occupied;
  const [isSearchingNext, setIsSearchingNext] = useState(false);
  const [searchNextError, setSearchNextError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSlotsForDate({ businessId, serviceId, professionalId, date, includeOccupied: true })
      .then((data) => {
        if (!cancelled) setResult({ key: `${serviceId}|${professionalId}|${date}`, ...data });
      })
      .catch(() => {
        if (!cancelled) setResult({ key: `${serviceId}|${professionalId}|${date}`, slots: [], occupied: [] });
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
  // Livres + ocupados (desabilitados): a grade mostra o dia como ele é, sem esconder o que já foi reservado.
  const timeSlots: TimeSlot[] = [
    ...displaySlots.map((slot) => ({ startAt: slot.startAt, unavailable: false })),
    ...occupied.filter((startAt) => !uniqueSlotsByTime.has(startAt)).map((startAt) => ({ startAt, unavailable: true })),
  ].map(({ startAt, unavailable }) => ({
    key: startAt,
    label: formatTime(startAt, timezone),
    minutesFromMidnight: utcToLocalMinutes(new Date(startAt), timezone),
    unavailable,
  }));

  async function handleFindNextAvailable() {
    setIsSearchingNext(true);
    setSearchNextError(null);
    try {
      for (let offset = 1; offset <= MAX_DAYS_TO_PROBE; offset++) {
        const candidateISO = addDaysToIsoDate(date, offset);
        if (candidateISO > lastDate) break;

        const { slots: candidateSlots } = await fetchSlotsForDate({
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
      const searchedUntil = addDaysToIsoDate(date, MAX_DAYS_TO_PROBE);
      setSearchNextError(
        searchedUntil >= lastDate
          ? `Não há horário livre até ${formatShortDate(lastDate)}, o último dia que a agenda está aberta. Fale com o negócio pelo WhatsApp, se precisar.`
          : `Procuramos até ${formatShortDate(searchedUntil)} e não há horário livre. Escolha uma data mais adiante na faixa acima.`,
      );
    } finally {
      setIsSearchingNext(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Escolha data e horário</h2>

      <DateStrip minDate={today} days={maxWindowDays + 1} selectedDate={date} timezone={timezone} closures={closures} onSelect={(nextDate) => { setDate(nextDate); setSearchNextError(null); }} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium first-letter:uppercase">{formatDateLabel(date, timezone)}</p>
        <Button variant="outline" size="sm" onClick={handleFindNextAvailable} disabled={isSearchingNext}>
          {isSearchingNext ? <Loader2 className="animate-spin" /> : <SparklesIcon />}
          Próximo horário disponível
        </Button>
      </div>
      {notice ? (
        <p role="alert" className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
          {notice}
        </p>
      ) : null}
      {searchNextError ? (
        <p role="status" className="rounded-lg border border-info/30 bg-info/10 p-3 text-sm">
          {searchNextError}
        </p>
      ) : null}

      {closedReason ? (
        <p role="status" className="flex items-center gap-2 rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
          <CalendarOff className="size-4 shrink-0" aria-hidden />
          Fechado neste dia: {closedReason}. Escolha outra data ou use “Próximo horário disponível”.
        </p>
      ) : isLoading ? (
        <SlotGridSkeleton />
      ) : (
        <TimeSlotGrid
          slots={timeSlots}
          onSelect={(slot) => onSelect(uniqueSlotsByTime.get(slot.key)!)}
          emptyDescription={searchNextError ? "Escolha outra data na faixa acima." : undefined}
        />
      )}
    </div>
  );
}
