"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CircleX } from "lucide-react";

import { minutesToTimeInput } from "@/lib/weekday";
import type { WorkingHoursWindow } from "@/server/modules/appointment/admin-booking-rules";

/** "Agora", atualizado a cada 30s — o aviso de passado não fica velho com o formulário aberto. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function describeHours(wh: WorkingHoursWindow): string {
  const base = `${minutesToTimeInput(wh.startMinute)}–${minutesToTimeInput(wh.endMinute)}`;
  return wh.breakStartMinute != null && wh.breakEndMinute != null
    ? `${base}, intervalo ${minutesToTimeInput(wh.breakStartMinute)}–${minutesToTimeInput(wh.breakEndMinute)}`
    : base;
}

/**
 * Aviso de horário nos formulários do painel (novo agendamento, remarcar).
 * Passado bloqueia o envio; fora do expediente só avisa — quem decide é o
 * botão "Agendar mesmo assim".
 */
export function BookingTimeNotice({
  professionalName,
  isPast,
  isOutsideHours,
  workingHours,
}: {
  professionalName: string;
  isPast: boolean;
  isOutsideHours: boolean;
  workingHours: WorkingHoursWindow | null;
}) {
  if (isPast) {
    return (
      <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
        <CircleX className="size-4 shrink-0" />
        Esse horário já passou. Escolha um horário a partir de agora.
      </p>
    );
  }
  if (!isOutsideHours) return null;
  return (
    <div role="status" className="flex gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
      <p>
        {workingHours
          ? `${professionalName} não atende neste horário (expediente ${describeHours(workingHours)}).`
          : `${professionalName} não tem expediente neste dia.`}{" "}
        <span className="text-muted-foreground">Se estiver cobrindo, confirme em “Agendar mesmo assim”.</span>
      </p>
    </div>
  );
}
