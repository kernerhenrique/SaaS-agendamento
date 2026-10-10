"use client";

import { useEffect, useRef } from "react";

import { addDaysToIsoDate, formatWeekdayShort } from "@/lib/date";
import { cn } from "@/lib/utils";
import { findClosure, type ClosureRange } from "@/server/modules/business/closure-rules";

/** Lista de `days` datas (YYYY-MM-DD) a partir de `minDateISO`, inclusive. */
export function buildDateStripDays(minDateISO: string, days: number): string[] {
  return Array.from({ length: days }, (_, index) => addDaysToIsoDate(minDateISO, index));
}

/**
 * Faixa horizontal rolável de dias (estilo Fresha), substituindo o calendário
 * de mês inteiro. Não desabilita dias sem vaga (exigiria checar disponibilidade
 * em lote) — o atalho "Próximo dia com horário" resolve isso navegando.
 */
export function DateStrip({
  minDate,
  selectedDate,
  timezone,
  days = 60,
  closures = [],
  onSelect,
}: {
  minDate: string;
  selectedDate: string;
  timezone: string;
  days?: number;
  /** Dias fechados do negócio: riscados, com o motivo anunciado (continuam clicáveis para mostrar o aviso). */
  closures?: ClosureRange[];
  onSelect: (dateISO: string) => void;
}) {
  const dates = buildDateStripDays(minDate, days);
  const listRef = useRef<HTMLDivElement>(null);

  // O dia escolhido fica sempre à vista (ex.: o "Voltar" reabre a faixa num dia lá na frente).
  // Rola só a faixa, nunca a página.
  useEffect(() => {
    const list = listRef.current;
    const chip = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !chip) return;
    const left = chip.offsetLeft - list.offsetLeft;
    if (left < list.scrollLeft || left + chip.offsetWidth > list.scrollLeft + list.clientWidth) {
      list.scrollLeft = Math.max(0, left - (list.clientWidth - chip.offsetWidth) / 2);
    }
  }, [selectedDate]);

  return (
    <div ref={listRef} role="listbox" aria-label="Escolha o dia" className="flex gap-2 overflow-x-auto pb-2">
      {dates.map((dateISO) => {
        const isSelected = dateISO === selectedDate;
        const dayNumber = Number(dateISO.slice(8, 10));
        const closure = findClosure(dateISO, closures);
        return (
          <button
            key={dateISO}
            type="button"
            role="option"
            aria-selected={isSelected}
            data-testid="date-strip-day"
            data-closed={closure ? "" : undefined}
            title={closure ? `Fechado: ${closure.reason}` : undefined}
            aria-label={closure ? `${formatWeekdayShort(dateISO, timezone)} ${dayNumber}, fechado: ${closure.reason}` : undefined}
            onClick={() => onSelect(dateISO)}
            className={cn(
              "flex shrink-0 flex-col items-center gap-0.5 rounded-xl border px-3 py-2 text-sm transition-colors",
              isSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:border-primary/40 hover:bg-muted",
              closure && !isSelected && "bg-muted text-muted-foreground line-through",
            )}
          >
            <span className={cn("text-caption uppercase", isSelected ? "opacity-90" : "text-muted-foreground")}>
              {formatWeekdayShort(dateISO, timezone)}
            </span>
            <span className="text-base font-semibold">{dayNumber}</span>
          </button>
        );
      })}
    </div>
  );
}
