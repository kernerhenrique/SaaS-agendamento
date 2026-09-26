"use client";

import { Ban, CalendarX } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STATUS_LABELS, STATUS_TONE } from "@/lib/appointment-status";

import type { AppointmentDto, ProfessionalOption, TimeBlockDto } from "./types";

/**
 * Agenda do dia no celular: em vez da grade (não cabe em 390px), uma lista por
 * profissional, trocando por abas. Toque abre o mesmo drawer de detalhes.
 */
export function AgendaDayList({
  professionals,
  appointments,
  timeBlocks,
  timezone,
  isLoading,
  onAppointmentClick,
}: {
  professionals: ProfessionalOption[];
  appointments: AppointmentDto[];
  timeBlocks: TimeBlockDto[];
  timezone: string;
  isLoading: boolean;
  onAppointmentClick: (appointment: AppointmentDto) => void;
}) {
  const formatTime = (iso: string) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

  if (professionals.length === 0) return null;

  return (
    <Tabs defaultValue={professionals[0].id}>
      <TabsList className="w-full justify-start overflow-x-auto">
        {professionals.map((professional) => {
          const count = appointments.filter((a) => a.professional.id === professional.id && a.status !== "CANCELLED").length;
          return (
            <TabsTrigger key={professional.id} value={professional.id} className="shrink-0">
              {professional.name.split(" ")[0]}
              <span className="text-caption text-muted-foreground">{count}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {professionals.map((professional) => {
        const items = [
          ...appointments
            .filter((a) => a.professional.id === professional.id)
            .map((a) => ({ kind: "appointment" as const, startAt: a.startAt, appointment: a })),
          ...timeBlocks
            .filter((b) => b.professionalId === professional.id)
            .map((b) => ({ kind: "block" as const, startAt: b.startAt, block: b })),
        ].sort((a, b) => a.startAt.localeCompare(b.startAt));

        return (
          <TabsContent key={professional.id} value={professional.id} className="pt-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : items.length === 0 ? (
              <EmptyState icon={CalendarX} title="Nada marcado neste dia" description="Use o botão + para encaixar alguém." />
            ) : (
              <ul className="flex flex-col gap-2">
                {items.map((item) =>
                  item.kind === "block" ? (
                    <li
                      key={item.block.id}
                      className="flex items-center gap-3 rounded-lg border border-dashed p-3 text-sm text-muted-foreground"
                    >
                      <Ban className="size-4 shrink-0" />
                      <span className="w-24 shrink-0 tabular-nums">
                        {formatTime(item.block.startAt)}–{formatTime(item.block.endAt)}
                      </span>
                      <span className="truncate">{item.block.reason ?? "Bloqueado"}</span>
                    </li>
                  ) : (
                    <li key={item.appointment.id}>
                      <button
                        type="button"
                        onClick={() => onAppointmentClick(item.appointment)}
                        className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left shadow-sm transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        <span className="w-12 shrink-0 text-sm font-semibold tabular-nums">
                          {formatTime(item.appointment.startAt)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{item.appointment.client.name}</span>
                          <span className="block truncate text-caption text-muted-foreground">
                            {item.appointment.service.name}
                          </span>
                        </span>
                        <StatusBadge tone={STATUS_TONE[item.appointment.status]}>
                          {STATUS_LABELS[item.appointment.status]}
                        </StatusBadge>
                      </button>
                    </li>
                  ),
                )}
              </ul>
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
