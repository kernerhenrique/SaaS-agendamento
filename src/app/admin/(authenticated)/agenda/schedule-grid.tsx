"use client";

import { useState } from "react";
import { Ban } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { AppointmentStatus, Weekday } from "@/generated/prisma/enums";
import { NEXT_STATUS_ACTIONS, STATUS_BLOCK_CLASSES, STATUS_LABELS } from "@/lib/appointment-status";
import { utcToLocalMinutes, weekdayOfLocalDate } from "@/lib/date";
import { getInitials } from "@/lib/text";
import { minutesToTimeInput } from "@/lib/weekday";
import { cn } from "cn";

import {
  computeDayRange,
  hourMarks,
  minutesToHeightPx,
  minutesToTopPx,
} from "./schedule-grid-math";
import type { AppointmentDto, ProfessionalOption, TimeBlockDto } from "./types";

const PIXELS_PER_HOUR = 64;

function formatTime(dateISO: string, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone, hour: "2-digit", minute: "2-digit" }).format(
    new Date(dateISO),
  );
}

export function ScheduleGrid({
  professionals,
  appointments,
  timeBlocks,
  date,
  timezone,
  isLoading,
  pendingActionId,
  onStatusChange,
}: {
  professionals: ProfessionalOption[];
  appointments: AppointmentDto[];
  timeBlocks: TimeBlockDto[];
  date: string;
  timezone: string;
  isLoading: boolean;
  pendingActionId: string | null;
  onStatusChange: (appointmentId: string, status: AppointmentStatus) => void;
}) {
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const selectedAppointment = appointments.find((a) => a.id === selectedAppointmentId) ?? null;

  const weekday: Weekday = weekdayOfLocalDate(date, timezone);

  const workingHourRanges = professionals.flatMap((professional) =>
    professional.workingHours
      .filter((wh) => wh.weekday === weekday)
      .map((wh) => ({ startMinute: wh.startMinute, endMinute: wh.endMinute })),
  );
  const itemRanges = [
    ...appointments.map((a) => ({
      startMinute: utcToLocalMinutes(new Date(a.startAt), timezone),
      endMinute: utcToLocalMinutes(new Date(a.endAt), timezone),
    })),
    ...timeBlocks.map((tb) => ({
      startMinute: utcToLocalMinutes(new Date(tb.startAt), timezone),
      endMinute: utcToLocalMinutes(new Date(tb.endAt), timezone),
    })),
  ];
  const range = computeDayRange(workingHourRanges, itemRanges);
  const marks = hourMarks(range);
  const totalHeight = minutesToTopPx(range.rangeEndMinute, range, PIXELS_PER_HOUR);

  if (isLoading) {
    return <ScheduleGridSkeleton professionalCount={professionals.length} />;
  }

  if (professionals.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum profissional cadastrado ainda.</p>;
  }

  return (
    <>
      <div className="flex overflow-x-auto rounded-lg border bg-card shadow-sm">
        <div className="sticky left-0 z-10 w-14 shrink-0 border-r bg-background">
          <div className="h-11 border-b" />
          <div className="relative" style={{ height: totalHeight }}>
            {marks.map((minute) => (
              <span
                key={minute}
                className="absolute inset-x-0 -translate-y-1/2 pr-1.5 text-right text-xs text-muted-foreground"
                style={{ top: minutesToTopPx(minute, range, PIXELS_PER_HOUR) }}
              >
                {minutesToTimeInput(minute)}
              </span>
            ))}
          </div>
        </div>

        {professionals.map((professional) => {
          const workingHoursToday =
            professional.workingHours.find((wh) => wh.weekday === weekday) ?? null;
          const profAppointments = appointments.filter((a) => a.professional.id === professional.id);
          const profTimeBlocks = timeBlocks.filter((tb) => tb.professionalId === professional.id);

          return (
            <div key={professional.id} className="min-w-44 flex-1 border-r last:border-r-0">
              <div className="sticky top-0 z-10 flex h-11 items-center gap-2 border-b bg-background px-2">
                <Avatar size="sm">
                  <AvatarImage src={professional.photoUrl ?? undefined} alt="" />
                  <AvatarFallback>{getInitials(professional.name)}</AvatarFallback>
                </Avatar>
                <span className="truncate text-sm font-medium">{professional.name}</span>
              </div>

              <div className="relative" style={{ height: totalHeight }}>
                {marks.map((minute) => (
                  <div
                    key={minute}
                    className="absolute inset-x-0 border-t border-border/60"
                    style={{ top: minutesToTopPx(minute, range, PIXELS_PER_HOUR) }}
                  />
                ))}

                {!workingHoursToday ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/30 text-center text-xs text-muted-foreground">
                    Sem expediente
                  </div>
                ) : (
                  <>
                    {workingHoursToday.startMinute > range.rangeStartMinute ? (
                      <div
                        className="absolute inset-x-0 bg-muted/30"
                        style={{
                          top: 0,
                          height: minutesToTopPx(workingHoursToday.startMinute, range, PIXELS_PER_HOUR),
                        }}
                      />
                    ) : null}
                    {workingHoursToday.endMinute < range.rangeEndMinute ? (
                      <div
                        className="absolute inset-x-0 bottom-0 bg-muted/30"
                        style={{
                          top: minutesToTopPx(workingHoursToday.endMinute, range, PIXELS_PER_HOUR),
                        }}
                      />
                    ) : null}
                    {workingHoursToday.breakStartMinute != null && workingHoursToday.breakEndMinute != null ? (
                      <div
                        className="absolute inset-x-0 bg-muted/30"
                        style={{
                          top: minutesToTopPx(workingHoursToday.breakStartMinute, range, PIXELS_PER_HOUR),
                          height: minutesToHeightPx(
                            workingHoursToday.breakStartMinute,
                            workingHoursToday.breakEndMinute,
                            PIXELS_PER_HOUR,
                            0,
                          ),
                        }}
                      />
                    ) : null}
                  </>
                )}

                {profTimeBlocks.map((timeBlock) => {
                  const startMinute = utcToLocalMinutes(new Date(timeBlock.startAt), timezone);
                  const endMinute = utcToLocalMinutes(new Date(timeBlock.endAt), timezone);
                  return (
                    <div
                      key={timeBlock.id}
                      className="absolute inset-x-1 flex items-center gap-1 overflow-hidden rounded-md px-1.5 text-[0.65rem] text-muted-foreground ring-1 ring-border"
                      style={{
                        top: minutesToTopPx(startMinute, range, PIXELS_PER_HOUR),
                        height: minutesToHeightPx(startMinute, endMinute, PIXELS_PER_HOUR),
                        backgroundImage:
                          "repeating-linear-gradient(45deg, var(--color-muted), var(--color-muted) 6px, transparent 6px, transparent 12px)",
                      }}
                      title={timeBlock.reason ?? "Bloqueado"}
                    >
                      <Ban className="size-3 shrink-0" />
                      <span className="truncate">{timeBlock.reason ?? "Bloqueado"}</span>
                    </div>
                  );
                })}

                {profAppointments.map((appointment) => {
                  const startMinute = utcToLocalMinutes(new Date(appointment.startAt), timezone);
                  const endMinute = utcToLocalMinutes(new Date(appointment.endAt), timezone);
                  return (
                    <button
                      key={appointment.id}
                      type="button"
                      className={cn(
                        "absolute inset-x-1 overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[0.7rem] shadow-sm transition-opacity hover:opacity-90",
                        STATUS_BLOCK_CLASSES[appointment.status],
                      )}
                      style={{
                        top: minutesToTopPx(startMinute, range, PIXELS_PER_HOUR),
                        height: minutesToHeightPx(startMinute, endMinute, PIXELS_PER_HOUR),
                      }}
                      onClick={() => setSelectedAppointmentId(appointment.id)}
                    >
                      <p className="truncate font-medium">
                        {formatTime(appointment.startAt, timezone)} · {appointment.client.name}
                      </p>
                      <p className="truncate opacity-90">{appointment.service.name}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog
        open={selectedAppointment != null}
        onOpenChange={(open) => {
          if (!open) setSelectedAppointmentId(null);
        }}
      >
        <DialogContent>
          {selectedAppointment ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedAppointment.service.name}</DialogTitle>
              </DialogHeader>
              <dl className="flex flex-col gap-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Horário</dt>
                  <dd className="font-medium">
                    {formatTime(selectedAppointment.startAt, timezone)}–
                    {formatTime(selectedAppointment.endAt, timezone)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Cliente</dt>
                  <dd className="font-medium">
                    {selectedAppointment.client.name} · {selectedAppointment.client.phone}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="font-medium">{STATUS_LABELS[selectedAppointment.status]}</dd>
                </div>
              </dl>
              {NEXT_STATUS_ACTIONS[selectedAppointment.status].length > 0 ? (
                <DialogFooter>
                  {NEXT_STATUS_ACTIONS[selectedAppointment.status].map((action) => (
                    <Button
                      key={action.status}
                      variant="outline"
                      size="sm"
                      disabled={pendingActionId === selectedAppointment.id}
                      onClick={() => onStatusChange(selectedAppointment.id, action.status)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </DialogFooter>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ScheduleGridSkeleton({ professionalCount }: { professionalCount: number }) {
  const columns = Math.max(professionalCount, 3);
  return (
    <div className="flex gap-2 overflow-hidden rounded-lg border bg-card p-2 shadow-sm">
      {Array.from({ length: columns }, (_, i) => (
        <div key={i} className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  );
}
