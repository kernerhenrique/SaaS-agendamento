"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDateLabel } from "@/lib/date";
import { cn } from "cn";

import { buildMonthGrid, shiftYearMonth, yearMonthOf } from "./month-grid";

const WEEKDAY_HEADERS = [
  { short: "D", long: "domingo" },
  { short: "S", long: "segunda-feira" },
  { short: "T", long: "terça-feira" },
  { short: "Q", long: "quarta-feira" },
  { short: "Q", long: "quinta-feira" },
  { short: "S", long: "sexta-feira" },
  { short: "S", long: "sábado" },
];

function formatMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "long", year: "numeric" }).format(
    new Date(Date.UTC(year, month - 1, 15)),
  );
}

/** Calendário mensal (estilo Calendly/Cal.com). Dias anteriores a `minDate` ficam desabilitados. */
export function MonthCalendar({
  visibleMonth,
  selectedDate,
  minDate,
  timezone,
  onMonthChange,
  onSelect,
}: {
  visibleMonth: string;
  selectedDate: string;
  minDate: string;
  timezone: string;
  onMonthChange: (yearMonth: string) => void;
  onSelect: (dateISO: string) => void;
}) {
  const weeks = buildMonthGrid(visibleMonth);
  const isFirstMonth = visibleMonth <= yearMonthOf(minDate);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold first-letter:uppercase">{formatMonthLabel(visibleMonth)}</p>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Mês anterior"
            disabled={isFirstMonth}
            onClick={() => onMonthChange(shiftYearMonth(visibleMonth, -1))}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Próximo mês"
            onClick={() => onMonthChange(shiftYearMonth(visibleMonth, 1))}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      <table className="w-full table-fixed border-separate border-spacing-0.5 text-center text-sm">
        <thead>
          <tr>
            {WEEKDAY_HEADERS.map((weekday) => (
              <th key={weekday.long} scope="col" className="pb-1 text-xs font-medium text-muted-foreground">
                <abbr title={weekday.long} className="no-underline">
                  {weekday.short}
                </abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, weekIndex) => (
            <tr key={weekIndex}>
              {week.map((dateISO, dayIndex) => {
                if (!dateISO) return <td key={dayIndex} />;
                const isPast = dateISO < minDate;
                const isSelected = dateISO === selectedDate;
                const isToday = dateISO === minDate;
                return (
                  <td key={dateISO}>
                    <button
                      type="button"
                      disabled={isPast}
                      aria-pressed={isSelected}
                      aria-label={formatDateLabel(dateISO, timezone)}
                      onClick={() => onSelect(dateISO)}
                      className={cn(
                        "relative mx-auto flex aspect-square w-full max-w-10 items-center justify-center rounded-full font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : // Texto na cor padrão (não na cor do negócio): legível com qualquer accentColor, nos dois temas.
                            "bg-primary/15 font-semibold text-foreground hover:bg-primary/30",
                        isPast && "bg-transparent font-normal text-muted-foreground/50 hover:bg-transparent",
                      )}
                    >
                      {Number(dateISO.slice(8))}
                      {isToday ? (
                        <span
                          aria-hidden
                          className={cn(
                            "absolute bottom-1 size-1 rounded-full",
                            isSelected ? "bg-primary-foreground" : "bg-primary",
                          )}
                        />
                      ) : null}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
