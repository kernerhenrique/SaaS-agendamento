import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { CalendarX } from "lucide-react";

export interface TimeSlot {
  key: string;
  label: string;
  minutesFromMidnight: number;
}

const PERIODS = [
  { label: "Manhã", isInPeriod: (minutes: number) => minutes < 12 * 60 },
  { label: "Tarde", isInPeriod: (minutes: number) => minutes >= 12 * 60 && minutes < 18 * 60 },
  { label: "Noite", isInPeriod: (minutes: number) => minutes >= 18 * 60 },
];

/**
 * Grade de horários agrupada em manhã/tarde/noite. Extraído de `DaySlots`
 * em `src/app/[slug]/datetime-step.tsx` — lá o botão de horário ainda é um
 * `<button>` puro; aqui já usa o `Button` do shadcn.
 */
export function TimeSlotGrid({ slots, onSelect }: { slots: TimeSlot[]; onSelect: (slot: TimeSlot) => void }) {
  if (slots.length === 0) {
    return <EmptyState icon={CalendarX} title="Nenhum horário disponível" description="Tente outra data." />;
  }

  return (
    <div className="flex flex-col gap-4">
      {PERIODS.map((period) => {
        const periodSlots = slots.filter((slot) => period.isInPeriod(slot.minutesFromMidnight));
        if (periodSlots.length === 0) return null;

        return (
          <div key={period.label} className="flex flex-col gap-2">
            <h3 className="text-caption font-medium text-muted-foreground uppercase">{period.label}</h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
              {periodSlots.map((slot) => (
                <Button key={slot.key} variant="outline" onClick={() => onSelect(slot)}>
                  {slot.label}
                </Button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
