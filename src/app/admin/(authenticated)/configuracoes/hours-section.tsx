"use client";

import { useState } from "react";

import { groupBusinessHours } from "@/lib/business-info";

import type { BusinessSettings } from "@/server/modules/business/business.service";

import {
  WorkingHoursEditor,
  buildWorkingHoursFormEntries,
  workingHoursFormEntriesToInput,
  type WorkingHoursFormEntry,
} from "../profissionais/working-hours-editor";
import { SettingsCard, useSaveSettings } from "./settings-card";

function toBusinessHours(entries: WorkingHoursFormEntry[]) {
  return workingHoursFormEntriesToInput(entries).map(({ weekday, startMinute, endMinute }) => ({ weekday, startMinute, endMinute }));
}

export function HoursSection({ business }: { business: BusinessSettings }) {
  const [entries, setEntries] = useState<WorkingHoursFormEntry[]>(() =>
    buildWorkingHoursFormEntries(
      business.workingHours.map((entry) => ({ ...entry, breakStartMinute: null, breakEndMinute: null })),
    ),
  );
  const { save, isSaving, error } = useSaveSettings();
  let preview: ReturnType<typeof groupBusinessHours> | null = null;
  try {
    preview = groupBusinessHours(toBusinessHours(entries));
  } catch {
    preview = null;
  }

  return (
    <SettingsCard
      id="horario"
      title="Horário de funcionamento"
      description="Aparece na página pública. O expediente de cada profissional precisa caber neste horário (os horários livres para reserva vêm do expediente)."
      isSaving={isSaving}
      error={error}
      onSubmit={() => save("/api/admin/business/hours", "PUT", { hours: toBusinessHours(entries) })}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
        <WorkingHoursEditor value={entries} onChange={setEntries} allowBreak={false} />
        {!entries.some((entry) => entry.enabled) ? (
          <p className="self-start rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            Nenhum dia marcado: a página pública não mostra horário de funcionamento.
          </p>
        ) : preview ? (
          <div className="self-start rounded-lg bg-muted p-3 text-sm">
            <p className="mb-2 font-medium">Na página pública</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
              {preview.map((group) => (
                <div key={group.days} className="contents">
                  <dt className="text-muted-foreground">{group.days}</dt>
                  <dd className="tabular-nums">{group.hours}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </div>
    </SettingsCard>
  );
}
