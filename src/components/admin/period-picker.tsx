"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PERIOD_LABELS, PERIOD_PRESETS, type PeriodPreset } from "@/lib/period";

/**
 * Seletor de período do Financeiro e dos Relatórios: presets e, em
 * "Personalizado", duas datas. A regra do intervalo fica em `src/lib/period.ts`.
 */
export function PeriodPicker({
  preset,
  onPresetChange,
  custom,
  onCustomChange,
  idPrefix,
}: {
  preset: PeriodPreset;
  onPresetChange: (preset: PeriodPreset) => void;
  custom: { startDate: string; endDate: string };
  onCustomChange: (custom: { startDate: string; endDate: string }) => void;
  idPrefix: string;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Select value={preset} onValueChange={(value) => onPresetChange((value as PeriodPreset) ?? "mes")}>
        <SelectTrigger aria-label="Período" className="w-44">
          <SelectValue>{(value: PeriodPreset) => PERIOD_LABELS[value]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {PERIOD_PRESETS.map((key) => (
            <SelectItem key={key} value={key}>
              {PERIOD_LABELS[key]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {preset === "personalizado" ? (
        <>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${idPrefix}-start`} className="text-caption">
              De
            </Label>
            <Input
              id={`${idPrefix}-start`}
              type="date"
              className="w-40"
              value={custom.startDate}
              max={custom.endDate}
              onChange={(event) => event.target.value && onCustomChange({ ...custom, startDate: event.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${idPrefix}-end`} className="text-caption">
              Até
            </Label>
            <Input
              id={`${idPrefix}-end`}
              type="date"
              className="w-40"
              value={custom.endDate}
              min={custom.startDate}
              onChange={(event) => event.target.value && onCustomChange({ ...custom, endDate: event.target.value })}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
