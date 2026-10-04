import { CalendarX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { cn } from "cn";

export interface TimeSlot {
  key: string;
  label: string;
  minutesFromMidnight: number;
  /** Ocupado: aparece desabilitado e riscado ("disponibilidade honesta"), não some. */
  unavailable?: boolean;
}

const PERIODS = [
  { label: "Manhã", isInPeriod: (minutes: number) => minutes < 12 * 60 },
  { label: "Tarde", isInPeriod: (minutes: number) => minutes >= 12 * 60 && minutes < 18 * 60 },
  { label: "Noite", isInPeriod: (minutes: number) => minutes >= 18 * 60 },
];

/**
 * Grade de horários agrupada em manhã/tarde/noite (design system: SlotPicker).
 * Horários ocupados ficam visíveis e desabilitados; o primeiro horário livre
 * do dia ganha o selo "Mais próximo".
 */
export function TimeSlotGrid({
  slots,
  onSelect,
  highlightFirst = true,
  emptyDescription = "Tente outra data ou use “Próximo horário disponível”.",
}: {
  slots: TimeSlot[];
  onSelect: (slot: TimeSlot) => void;
  highlightFirst?: boolean;
  /** Texto do estado vazio (ex.: depois que a busca do próximo horário já falhou). */
  emptyDescription?: string;
}) {
  const firstFree = slots.filter((slot) => !slot.unavailable).sort((a, b) => a.minutesFromMidnight - b.minutesFromMidnight)[0];

  if (!firstFree) {
    return (
      <EmptyState
        icon={CalendarX}
        title={slots.length > 0 ? "Todos os horários deste dia estão ocupados" : "Nenhum horário disponível"}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {PERIODS.map((period) => {
        const periodSlots = slots
          .filter((slot) => period.isInPeriod(slot.minutesFromMidnight))
          .sort((a, b) => a.minutesFromMidnight - b.minutesFromMidnight);
        if (periodSlots.length === 0) return null;

        return (
          <div key={period.label} className="flex flex-col gap-2">
            <h3 className="text-caption font-medium text-muted-foreground uppercase">{period.label}</h3>
            <div className="grid grid-cols-3 gap-2 pt-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
              {periodSlots.map((slot) => {
                const isFirst = highlightFirst && slot.key === firstFree.key;
                return (
                  <Button
                    key={slot.key}
                    variant="outline"
                    data-testid="time-slot"
                    data-unavailable={slot.unavailable ? "true" : undefined}
                    disabled={slot.unavailable}
                    aria-label={slot.unavailable ? `${slot.label}, ocupado` : isFirst ? `${slot.label}, mais próximo` : undefined}
                    title={slot.unavailable ? "Ocupado" : undefined}
                    onClick={() => onSelect(slot)}
                    className={cn(
                      "relative h-11 tabular-nums",
                      slot.unavailable && "bg-muted text-muted-foreground line-through disabled:opacity-100",
                      isFirst && "border-primary",
                    )}
                  >
                    {slot.label}
                    {isFirst ? (
                      <span
                        aria-hidden
                        className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 text-caption font-medium whitespace-nowrap text-primary-foreground no-underline"
                      >
                        Mais próximo
                      </span>
                    ) : null}
                  </Button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
