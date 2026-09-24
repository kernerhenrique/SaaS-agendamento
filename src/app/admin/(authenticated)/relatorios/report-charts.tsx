"use client";

import { useState, type ReactNode } from "react";
import { BarChart3, Table2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "cn";

const NICE_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
const MAX_TICKS = 4;

/** Topo do eixo e intervalo entre linhas de grade, em números "redondos". */
export function niceScale(maxValue: number): { top: number; step: number } {
  const step = NICE_STEPS.find((s) => maxValue / s <= MAX_TICKS) ?? Math.ceil(maxValue / MAX_TICKS);
  return { top: Math.max(step, Math.ceil(maxValue / step) * step), step };
}

function parseIsoDate(dateISO: string): Date {
  const [year, month, day] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

const shortDateFormat = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit" });
const longDateFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
});

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** Card de gráfico com alternância para uma tabela equivalente (acessível e exata). */
export function ChartCard({
  title,
  chart,
  table,
  className,
}: {
  title: string;
  chart: ReactNode;
  table: ReactNode;
  className?: string;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const isTable = view === "table";

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={isTable}
            onClick={() => setView(isTable ? "chart" : "table")}
          >
            {isTable ? <BarChart3 /> : <Table2 />}
            {isTable ? "Gráfico" : "Tabela"}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>{isTable ? table : chart}</CardContent>
    </Card>
  );
}

export function DataTable({ columns, rows }: { columns: [string, string]; rows: [ReactNode, number][] }) {
  return (
    <div className="max-h-72 overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
          <tr>
            <th className="py-1.5 font-medium">{columns[0]}</th>
            <th className="py-1.5 text-right font-medium">{columns[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value], index) => (
            <tr key={index} className="border-t">
              <td className="py-1.5">{label}</td>
              <td className="py-1.5 text-right tabular-nums">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Colunas por dia. Só a maior coluna recebe rótulo fixo; o valor de cada dia
 * aparece no tooltip ao passar o mouse ou focar via teclado.
 */
export function DailyColumnChart({ data }: { data: { date: string; count: number }[] }) {
  const maxValue = Math.max(0, ...data.map((d) => d.count));
  const { top, step } = niceScale(maxValue);
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  const maxIndex = maxValue > 0 ? data.findIndex((d) => d.count === maxValue) : -1;
  // Rótulos esparsos no eixo X: no máximo ~6, sempre incluindo o primeiro dia.
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));
  const gapClass = data.length > 60 ? "gap-0" : "gap-0.5";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2 pt-5">
        {/* Eixo Y */}
        <div className="relative h-48 w-6 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 translate-y-1/2"
              style={{ bottom: `${(tick / top) * 100}%` }}
            >
              {tick}
            </span>
          ))}
        </div>

        {/* Área de plotagem */}
        <div className="relative h-48 flex-1">
          {ticks.map((tick) => (
            <div
              key={tick}
              aria-hidden
              className={cn("absolute inset-x-0 border-t", tick === 0 ? "border-foreground/30" : "border-border")}
              style={{ bottom: `${(tick / top) * 100}%` }}
            />
          ))}

          <div className={cn("absolute inset-0 flex items-end", gapClass)}>
            {data.map((day, index) => {
              const heightPercent = (day.count / top) * 100;
              const alignRight = index >= data.length / 2;
              return (
                <button
                  key={day.date}
                  type="button"
                  aria-label={`${longDateFormat.format(parseIsoDate(day.date))}: ${pluralize(day.count, "agendamento", "agendamentos")}`}
                  className="group relative flex h-full flex-1 items-end justify-center rounded-sm outline-none hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    className="relative w-full max-w-6 rounded-t-[4px] bg-viz-series-1"
                    style={{ height: day.count > 0 ? `max(${heightPercent}%, 2px)` : 0 }}
                  >
                    {index === maxIndex && (
                      <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 text-xs font-medium text-foreground tabular-nums group-hover:invisible group-focus-visible:invisible">
                        {day.count}
                      </span>
                    )}
                  </span>

                  {/* Tooltip */}
                  <span
                    role="presentation"
                    className={cn(
                      "pointer-events-none invisible absolute z-10 mb-1 flex flex-col whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-left shadow-md group-hover:visible group-focus-visible:visible",
                      alignRight ? "right-0" : "left-0",
                    )}
                    style={{ bottom: `calc(${heightPercent}% + 4px)` }}
                  >
                    <strong className="text-sm font-semibold text-popover-foreground tabular-nums">
                      {pluralize(day.count, "agendamento", "agendamentos")}
                    </strong>
                    <span className="text-xs text-muted-foreground">
                      {longDateFormat.format(parseIsoDate(day.date))}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Eixo X */}
      <div className={cn("ml-8 flex text-xs text-muted-foreground", gapClass)}>
        {data.map((day, index) => (
          <span key={day.date} className="relative flex-1">
            {index % labelEvery === 0 && (
              <span className="absolute left-0 whitespace-nowrap">
                {shortDateFormat.format(parseIsoDate(day.date))}
              </span>
            )}
          </span>
        ))}
      </div>
      <div className="h-4" aria-hidden />
    </div>
  );
}

/** Barras horizontais com o valor escrito na ponta de cada barra. */
export function HorizontalBarChart({
  rows,
}: {
  rows: { key: string; label: ReactNode; value: number }[];
}) {
  const maxValue = Math.max(1, ...rows.map((r) => r.value));

  return (
    <ul className="flex flex-col gap-1">
      {rows.map((row) => (
        <li
          key={row.key}
          className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 rounded-md px-1 py-1 hover:bg-muted/50"
        >
          <div className="min-w-0 truncate text-sm">{row.label}</div>
          <div className="flex items-center gap-2">
            <div
              className="h-5 rounded-r-[4px] bg-viz-series-1"
              style={{ width: row.value > 0 ? `max(${(row.value / maxValue) * 85}%, 2px)` : 0 }}
            />
            <span className="text-sm font-medium tabular-nums">{row.value}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
