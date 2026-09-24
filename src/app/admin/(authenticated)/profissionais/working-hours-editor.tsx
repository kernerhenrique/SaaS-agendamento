"use client";

import { Weekday } from "@/generated/prisma/enums";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "cn";
import { WEEKDAY_LABELS, WEEKDAY_ORDER, minutesToTimeInput, timeInputToMinutes } from "@/lib/weekday";

import type { WorkingHoursInput } from "@/server/modules/professional/professional.service";

export interface WorkingHoursFormEntry {
  weekday: Weekday;
  enabled: boolean;
  startTime: string;
  endTime: string;
  hasBreak: boolean;
  breakStartTime: string;
  breakEndTime: string;
}

export function buildWorkingHoursFormEntries(existing: WorkingHoursInput[]): WorkingHoursFormEntry[] {
  return WEEKDAY_ORDER.map((weekday) => {
    const found = existing.find((wh) => wh.weekday === weekday);
    if (!found) {
      return {
        weekday,
        enabled: false,
        startTime: "09:00",
        endTime: "18:00",
        hasBreak: false,
        breakStartTime: "12:00",
        breakEndTime: "13:00",
      };
    }
    return {
      weekday,
      enabled: true,
      startTime: minutesToTimeInput(found.startMinute),
      endTime: minutesToTimeInput(found.endMinute),
      hasBreak: found.breakStartMinute != null && found.breakEndMinute != null,
      breakStartTime:
        found.breakStartMinute != null ? minutesToTimeInput(found.breakStartMinute) : "12:00",
      breakEndTime: found.breakEndMinute != null ? minutesToTimeInput(found.breakEndMinute) : "13:00",
    };
  });
}

/** Converte as entradas do formulário para o formato aceito pela API. Lança
 * se algum horário estiver num formato inválido (não deveria acontecer com
 * `<input type="time">`, mas mantém a função total). */
export function workingHoursFormEntriesToInput(entries: WorkingHoursFormEntry[]): WorkingHoursInput[] {
  return entries
    .filter((entry) => entry.enabled)
    .map((entry) => {
      const startMinute = timeInputToMinutes(entry.startTime);
      const endMinute = timeInputToMinutes(entry.endTime);
      if (startMinute === null || endMinute === null) {
        throw new Error(`Horário inválido em ${WEEKDAY_LABELS[entry.weekday]}`);
      }
      const breakStartMinute = entry.hasBreak ? timeInputToMinutes(entry.breakStartTime) : null;
      const breakEndMinute = entry.hasBreak ? timeInputToMinutes(entry.breakEndTime) : null;
      return { weekday: entry.weekday, startMinute, endMinute, breakStartMinute, breakEndMinute };
    });
}

export function WorkingHoursEditor({
  value,
  onChange,
}: {
  value: WorkingHoursFormEntry[];
  onChange: (next: WorkingHoursFormEntry[]) => void;
}) {
  function updateEntry(index: number, patch: Partial<WorkingHoursFormEntry>) {
    onChange(value.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  }

  return (
    <div className="flex flex-col gap-2">
      {value.map((entry, index) => (
        <div
          key={entry.weekday}
          className={cn(
            "flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm transition-colors",
            entry.enabled ? "border-primary/30 bg-primary/5" : "border-border",
          )}
        >
          <Label className="flex w-24 items-center gap-2 font-normal">
            <Checkbox
              checked={entry.enabled}
              onCheckedChange={(checked) => updateEntry(index, { enabled: checked === true })}
            />
            {WEEKDAY_LABELS[entry.weekday]}
          </Label>
          {entry.enabled ? (
            <>
              <Input
                type="time"
                className="w-28"
                value={entry.startTime}
                onChange={(event) => updateEntry(index, { startTime: event.target.value })}
              />
              <span className="text-muted-foreground">até</span>
              <Input
                type="time"
                className="w-28"
                value={entry.endTime}
                onChange={(event) => updateEntry(index, { endTime: event.target.value })}
              />
              <Label className="flex items-center gap-1 font-normal">
                <Checkbox
                  checked={entry.hasBreak}
                  onCheckedChange={(checked) => updateEntry(index, { hasBreak: checked === true })}
                />
                Almoço
              </Label>
              {entry.hasBreak ? (
                <>
                  <Input
                    type="time"
                    className="w-28"
                    value={entry.breakStartTime}
                    onChange={(event) => updateEntry(index, { breakStartTime: event.target.value })}
                  />
                  <span className="text-muted-foreground">até</span>
                  <Input
                    type="time"
                    className="w-28"
                    value={entry.breakEndTime}
                    onChange={(event) => updateEntry(index, { breakEndTime: event.target.value })}
                  />
                </>
              ) : null}
            </>
          ) : (
            <span className="text-muted-foreground">Fechado</span>
          )}
        </div>
      ))}
    </div>
  );
}
