"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SlotGridSkeleton } from "@/components/slot-grid-skeleton";
import { addDaysToIsoDate, formatDateLabel, todayInTimeZone, utcToLocalMinutes } from "@/lib/date";

import { MonthCalendar } from "./month-calendar";
import { yearMonthOf } from "./month-grid";
import { NO_PREFERENCE, type AvailableSlot } from "./types";

function formatTime(dateISO: string, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone, hour: "2-digit", minute: "2-digit" }).format(
    new Date(dateISO),
  );
}

const PERIODS = [
  { label: "Manhã", isInPeriod: (minutes: number) => minutes < 12 * 60 },
  { label: "Tarde", isInPeriod: (minutes: number) => minutes >= 12 * 60 && minutes < 18 * 60 },
  { label: "Noite", isInPeriod: (minutes: number) => minutes >= 18 * 60 },
];

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
  const [visibleMonth, setVisibleMonth] = useState(() => yearMonthOf(today));
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Reinicia o estado de carregamento a cada busca; padrão de efeito de
    // fetch com flag de loading e cancelamento de corrida, não um bug.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // Navegar pelas setas de dia também leva o calendário ao mês da nova data.
  function changeDate(dateISO: string) {
    setDate(dateISO);
    setVisibleMonth(yearMonthOf(dateISO));
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Escolha data e horário</h2>

      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="w-full max-w-sm self-start rounded-xl border bg-card p-4 shadow-sm">
          <MonthCalendar
            visibleMonth={visibleMonth}
            selectedDate={date}
            minDate={today}
            timezone={timezone}
            onMonthChange={setVisibleMonth}
            onSelect={changeDate}
          />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Dia anterior"
              disabled={date <= today}
              onClick={() => changeDate(addDaysToIsoDate(date, -1))}
            >
              <ChevronLeft />
            </Button>
            <p className="min-w-48 text-center text-sm font-medium first-letter:uppercase">
              {formatDateLabel(date, timezone)}
            </p>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Próximo dia"
              onClick={() => changeDate(addDaysToIsoDate(date, 1))}
            >
              <ChevronRight />
            </Button>
          </div>

          <DaySlots
            isLoading={isLoading}
            displaySlots={displaySlots}
            timezone={timezone}
            onSelect={onSelect}
          />
        </div>
      </div>
    </div>
  );
}

function DaySlots({
  isLoading,
  displaySlots,
  timezone,
  onSelect,
}: {
  isLoading: boolean;
  displaySlots: AvailableSlot[];
  timezone: string;
  onSelect: (slot: AvailableSlot) => void;
}) {
  return (
    <>
      {isLoading ? (
        <SlotGridSkeleton />
      ) : displaySlots.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum horário disponível neste dia. Tente outra data.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {PERIODS.map((period) => {
            const periodSlots = displaySlots.filter((slot) =>
              period.isInPeriod(utcToLocalMinutes(new Date(slot.startAt), timezone)),
            );
            if (periodSlots.length === 0) return null;

            return (
              <div key={period.label} className="flex flex-col gap-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase">{period.label}</h3>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
                  {periodSlots.map((slot) => (
                    <button
                      key={slot.startAt}
                      type="button"
                      data-testid="time-slot"
                      className="rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:border-primary focus-visible:bg-primary focus-visible:text-primary-foreground"
                      onClick={() => onSelect(slot)}
                    >
                      {formatTime(slot.startAt, timezone)}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
