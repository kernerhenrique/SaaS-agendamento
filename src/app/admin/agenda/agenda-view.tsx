"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppointmentStatus } from "@/generated/prisma/enums";
import { addDaysToIsoDate, formatDateLabel, todayInTimeZone } from "@/lib/date";
import { NEXT_STATUS_ACTIONS, STATUS_BADGE_CLASSES, STATUS_LABELS } from "@/lib/appointment-status";

import { NewAppointmentDialog } from "./new-appointment-dialog";

export interface ProfessionalOption {
  id: string;
  name: string;
  services: { id: string; name: string; durationMin: number }[];
}

export interface AppointmentDto {
  id: string;
  status: AppointmentStatus;
  startAt: string;
  endAt: string;
  professional: { id: string; name: string };
  service: { id: string; name: string; durationMin: number };
  client: { id: string; name: string; phone: string };
}

function formatTime(dateISO: string, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateISO));
}

export function AgendaView({
  timezone,
  professionals,
}: {
  timezone: string;
  professionals: ProfessionalOption[];
}) {
  const [date, setDate] = useState(() => todayInTimeZone(timezone));
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/appointments?startDate=${date}&endDate=${date}`,
      );
      const data = await response.json();
      setAppointments(response.ok ? data.appointments : []);
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const appointmentsByProfessional = useMemo(() => {
    const map = new Map<string, AppointmentDto[]>();
    for (const professional of professionals) {
      map.set(professional.id, []);
    }
    for (const appointment of appointments) {
      const list = map.get(appointment.professional.id) ?? [];
      list.push(appointment);
      map.set(appointment.professional.id, list);
    }
    return map;
  }, [appointments, professionals]);

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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setDate((d) => addDaysToIsoDate(d, -1))}>
            ← Anterior
          </Button>
          <div className="min-w-56 text-center">
            <p className="text-sm font-medium capitalize">{formatDateLabel(date, timezone)}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setDate((d) => addDaysToIsoDate(d, 1))}>
            Próximo →
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

      <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {professionals.map((professional) => (
          <Card key={professional.id} size="sm">
            <CardHeader>
              <CardTitle className="text-base">{professional.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : (appointmentsByProfessional.get(professional.id) ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum agendamento neste dia.</p>
              ) : (
                appointmentsByProfessional.get(professional.id)!.map((appointment) => (
                  <div key={appointment.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        {formatTime(appointment.startAt, timezone)}–{formatTime(appointment.endAt, timezone)}
                      </span>
                      <Badge variant="outline" className={STATUS_BADGE_CLASSES[appointment.status]}>
                        {STATUS_LABELS[appointment.status]}
                      </Badge>
                    </div>
                    <p className="mt-1">{appointment.service.name}</p>
                    <p className="text-muted-foreground">
                      {appointment.client.name} · {appointment.client.phone}
                    </p>
                    {NEXT_STATUS_ACTIONS[appointment.status].length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {NEXT_STATUS_ACTIONS[appointment.status].map((action) => (
                          <Button
                            key={action.status}
                            size="sm"
                            variant="outline"
                            disabled={pendingActionId === appointment.id}
                            onClick={() => handleStatusChange(appointment.id, action.status)}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
