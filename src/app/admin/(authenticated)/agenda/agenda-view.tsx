"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AppointmentStatus } from "@/generated/prisma/enums";
import { addDaysToIsoDate, formatDateLabel, todayInTimeZone } from "@/lib/date";

import { NewAppointmentDialog } from "./new-appointment-dialog";
import { ScheduleGrid } from "./schedule-grid";
import type { AppointmentDto, ProfessionalOption, TimeBlockDto } from "./types";

export function AgendaView({
  timezone,
  professionals,
}: {
  timezone: string;
  professionals: ProfessionalOption[];
}) {
  const [date, setDate] = useState(() => todayInTimeZone(timezone));
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlockDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/appointments?startDate=${date}&endDate=${date}`);
      const data = await response.json();
      setAppointments(response.ok ? data.appointments : []);
      setTimeBlocks(response.ok ? data.timeBlocks : []);
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  useEffect(() => {
    // Busca ao montar/trocar de data; loadAppointments seta isLoading antes do
    // fetch — padrão de efeito de busca com flag de carregamento, não um bug.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAppointments();
  }, [loadAppointments]);

  async function handleStatusChange(appointmentId: string, status: AppointmentStatus) {
    setActionError(null);
    setPendingActionId(appointmentId);
    try {
      const response = await fetch(`/api/admin/appointments/${appointmentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) {
        setActionError(data?.error ?? "Não foi possível atualizar o status");
        return;
      }
      await loadAppointments();
    } finally {
      setPendingActionId(null);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Agenda</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            aria-label="Dia anterior"
            onClick={() => setDate((d) => addDaysToIsoDate(d, -1))}
          >
            <ChevronLeft />
          </Button>
          <div className="min-w-56 text-center">
            <p className="text-sm font-medium first-letter:uppercase">{formatDateLabel(date, timezone)}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            aria-label="Próximo dia"
            onClick={() => setDate((d) => addDaysToIsoDate(d, 1))}
          >
            <ChevronRight />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDate(todayInTimeZone(timezone))}>
            Hoje
          </Button>
        </div>
        <NewAppointmentDialog
          professionals={professionals}
          defaultDate={date}
          timezone={timezone}
          onCreated={loadAppointments}
        />
      </div>

      {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}

      <ScheduleGrid
        professionals={professionals}
        appointments={appointments}
        timeBlocks={timeBlocks}
        date={date}
        timezone={timezone}
        isLoading={isLoading}
        pendingActionId={pendingActionId}
        onStatusChange={handleStatusChange}
      />
    </main>
  );
}
