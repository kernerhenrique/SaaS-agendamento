"use client";

import { useState } from "react";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { describeBookingPolicies, formatMinutesDuration } from "@/lib/business-info";
import { minutesToTimeInput } from "@/lib/weekday";

import type { BusinessSettings } from "@/server/modules/business/business.service";

import { SettingsCard, useSaveSettings } from "./settings-card";

const HOUR = 60;
const DAY = 24 * HOUR;
const NOTICE_OPTIONS = [0, 30, HOUR, 2 * HOUR, 3 * HOUR, 6 * HOUR, 12 * HOUR, DAY, 2 * DAY, 3 * DAY, 7 * DAY];
const WINDOW_OPTIONS = [7, 14, 30, 60, 90, 180, 365];
const DEADLINE_OPTIONS = [0, 1, 2, 3, 6, 12, 24, 48, 72];

const noticeLabel = (minutes: number) => (minutes === 0 ? "Sem antecedência" : formatMinutesDuration(minutes));
const windowLabel = (days: number) => (days === 365 ? "1 ano" : `${days} dias`);
const deadlineLabel = (hours: number) => (hours === 0 ? "Até o horário marcado" : `Até ${formatMinutesDuration(hours * HOUR)} antes`);

/** Opções prontas + o valor atual, se ele tiver vindo de fora da lista (seed, clone). */
const withCurrent = (options: number[], current: number) =>
  options.includes(current) ? options : [...options, current].sort((a, b) => a - b);

/** Exemplo concreto da antecedência: "quem abrir às 14:00 vê horários a partir das 16:00". */
function noticeExample(minutes: number): string {
  if (minutes === 0) return "Quem abrir a página às 14:00 já pode reservar o próximo horário livre do dia.";
  const total = 14 * HOUR + minutes;
  const days = Math.floor(total / DAY);
  const time = minutesToTimeInput(total % DAY);
  const when = days === 0 ? `das ${time} de hoje` : days === 1 ? `de amanhã às ${time}` : `de daqui a ${days} dias às ${time}`;
  return `Quem abrir a página hoje às 14:00 só vê horários a partir ${when}.`;
}

function PolicySelect({
  id,
  label,
  help,
  value,
  options,
  format,
  onChange,
}: {
  id: string;
  label: string;
  help: string;
  value: number;
  options: number[];
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={String(value)} onValueChange={(next) => next != null && onChange(Number(next))}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue>{(selected: string) => format(Number(selected))}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={String(option)}>
              {format(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-caption text-muted-foreground">{help}</p>
    </div>
  );
}

export function PoliciesSection({ business }: { business: BusinessSettings }) {
  const [notice, setNotice] = useState(business.minBookingNoticeMinutes);
  const [windowDays, setWindowDays] = useState(business.maxBookingWindowDays);
  const [deadline, setDeadline] = useState(business.cancellationDeadlineHours);
  const [policyText, setPolicyText] = useState(business.policyText ?? "");
  const { save, isSaving, error } = useSaveSettings();
  const sentences = describeBookingPolicies({
    minBookingNoticeMinutes: notice,
    maxBookingWindowDays: windowDays,
    cancellationDeadlineHours: deadline,
  });

  return (
    <SettingsCard
      id="reservas"
      title="Reservas"
      description="Regras para quem reserva pela página pública ou mexe no próprio agendamento pelo link. Encaixes feitos por você no painel não seguem essas regras."
      isSaving={isSaving}
      error={error}
      onSubmit={() =>
        save("/api/admin/business", "PATCH", {
          secao: "reservas",
          minBookingNoticeMinutes: notice,
          maxBookingWindowDays: windowDays,
          cancellationDeadlineHours: deadline,
          policyText,
        })
      }
    >
      <div className="grid gap-5 sm:grid-cols-3">
        <PolicySelect
          id="policy-notice"
          label="Antecedência mínima"
          help={noticeExample(notice)}
          value={notice}
          options={withCurrent(NOTICE_OPTIONS, notice)}
          format={noticeLabel}
          onChange={setNotice}
        />
        <PolicySelect
          id="policy-window"
          label="Agenda aberta para"
          help="Até quantos dias à frente o cliente consegue reservar."
          value={windowDays}
          options={withCurrent(WINDOW_OPTIONS, windowDays)}
          format={windowLabel}
          onChange={setWindowDays}
        />
        <PolicySelect
          id="policy-deadline"
          label="Cancelar ou trocar pelo link"
          help="Depois do prazo, o link pede para o cliente falar com você."
          value={deadline}
          options={withCurrent(DEADLINE_OPTIONS, deadline)}
          format={deadlineLabel}
          onChange={setDeadline}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="policy-text">Recado para o cliente (opcional)</Label>
        <Textarea
          id="policy-text"
          rows={3}
          maxLength={1000}
          placeholder="Ex.: Chegue com 10 minutos de antecedência. Atrasos acima de 15 minutos podem precisar ser remarcados."
          value={policyText}
          onChange={(event) => setPolicyText(event.target.value)}
        />
        <p className="text-caption text-muted-foreground">Aparece na página pública e na hora de confirmar a reserva.</p>
      </div>

      <div className="rounded-lg bg-muted p-3 text-sm">
        <p className="mb-1.5 font-medium">O cliente vê assim</p>
        <ul className="flex list-disc flex-col gap-1 pl-4 text-muted-foreground">
          {sentences.map((sentence) => (
            <li key={sentence}>{sentence}</li>
          ))}
        </ul>
        {policyText.trim() ? <p className="mt-2 whitespace-pre-line text-muted-foreground">{policyText.trim()}</p> : null}
      </div>
    </SettingsCard>
  );
}
