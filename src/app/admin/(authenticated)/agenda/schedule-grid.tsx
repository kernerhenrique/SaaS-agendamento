"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Ban } from "lucide-react";

import { PaymentIndicator } from "@/components/admin/payment-indicator";
import { SeriesIndicator } from "@/components/admin/series-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_BLOCK_CLASSES, STATUS_LABELS } from "@/lib/appointment-status";
import { localDayRangeUtc, utcToLocalMinutes } from "@/lib/date";
import { minutesToTimeInput } from "@/lib/weekday";
import { RESCHEDULABLE_STATUSES } from "@/server/modules/appointment/reschedule-rules";
import { cn } from "cn";

import {
  clampToRange,
  computeDayRange,
  hourMarks,
  instantRangeToDayMinutes,
  minutesToHeightPx,
  minutesToTopPx,
  pxToMinute,
  snapDeltaMinutes,
  type DayRange,
  type MinuteRange,
} from "./schedule-grid-math";
import type { AppointmentDto, TimeBlockDto, WorkingHoursEntry } from "./types";

// 96px/h: um serviço de 30min ocupa 48px, o suficiente para duas linhas.
export const PIXELS_PER_HOUR = 96;
const MIN_APPOINTMENT_HEIGHT_PX = 44;
const COMPACT_BLOCK_HEIGHT_PX = 56;
// Respiro para os rótulos de hora centralizados na linha não serem cortados.
const GRID_BODY_CLASS = "relative my-3";

/** Uma coluna da grade: um profissional num dia (visão dia) ou um dia de um profissional (visão semana). */
export interface GridColumn {
  key: string;
  professionalId: string;
  date: string;
  header: ReactNode;
  workingHours: WorkingHoursEntry | null;
  appointments: AppointmentDto[];
  timeBlocks: TimeBlockDto[];
  isToday: boolean;
  /** Dia anterior a hoje: a coluna inteira aparece como "já passou". */
  isBeforeToday: boolean;
  /** Negócio fechado no dia (feriado, férias): faixa hachurada com o motivo; encaixe só com confirmação. */
  closedReason: string | null;
}

export interface AppointmentDrop {
  appointment: AppointmentDto;
  column: GridColumn;
  startMinute: number;
  endMinute: number;
}

function formatTime(dateISO: string, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone, hour: "2-digit", minute: "2-digit" }).format(new Date(dateISO));
}

/** Minuto local de "agora", atualizado a cada 60s (para a linha vermelha). */
function useNowMinute(timeZone: string): number | null {
  const [minute, setMinute] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setMinute(utcToLocalMinutes(new Date(), timeZone));
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [timeZone]);
  return minute;
}

export function ScheduleGrid({
  columns,
  timezone,
  isLoading,
  onAppointmentClick,
  onEmptySlotClick,
  onAppointmentDrop,
}: {
  columns: GridColumn[];
  timezone: string;
  isLoading: boolean;
  onAppointmentClick: (appointment: AppointmentDto) => void;
  onEmptySlotClick: (column: GridColumn, minute: number) => void;
  onAppointmentDrop: (drop: AppointmentDrop) => void;
}) {
  const nowMinute = useNowMinute(timezone);
  // Um arrasto termina com um "click" no próprio bloco; ignorado para não abrir o drawer.
  const justDraggedRef = useRef(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const minutesByAppointment = new Map<string, MinuteRange>();
  const minutesByBlock = new Map<string, MinuteRange>();
  for (const column of columns) {
    const day = localDayRangeUtc(column.date, timezone);
    for (const a of column.appointments) {
      minutesByAppointment.set(a.id, instantRangeToDayMinutes(new Date(a.startAt), new Date(a.endAt), day, timezone));
    }
    for (const b of column.timeBlocks) {
      minutesByBlock.set(`${column.key}:${b.id}`, instantRangeToDayMinutes(new Date(b.startAt), new Date(b.endAt), day, timezone));
    }
  }
  // Bloqueios ficam de fora: um feriado de dia inteiro esticaria a grade para 00–24h.
  const range = computeDayRange(
    columns.flatMap((c) => (c.workingHours ? [{ startMinute: c.workingHours.startMinute, endMinute: c.workingHours.endMinute }] : [])),
    [...minutesByAppointment.values()],
  );
  const marks = hourMarks(range);
  const totalHeight = minutesToTopPx(range.rangeEndMinute, range, PIXELS_PER_HOUR);

  function handleDragEnd(event: DragEndEvent) {
    const appointment = event.active.data.current?.appointment as AppointmentDto | undefined;
    const origin = event.active.data.current?.column as GridColumn | undefined;
    if (!appointment || !origin) return;
    justDraggedRef.current = true;
    setTimeout(() => (justDraggedRef.current = false), 150);

    const target = (event.over?.data.current?.column as GridColumn | undefined) ?? origin;
    const minutes = minutesByAppointment.get(appointment.id)!;
    const duration = minutes.endMinute - minutes.startMinute;
    const startMinute = Math.min(
      Math.max(minutes.startMinute + snapDeltaMinutes(event.delta.y, PIXELS_PER_HOUR), 0),
      24 * 60 - duration,
    );
    if (target.key === origin.key && startMinute === minutes.startMinute) return;
    onAppointmentDrop({ appointment, column: target, startMinute, endMinute: startMinute + duration });
  }

  if (isLoading) return <ScheduleGridSkeleton columnCount={columns.length} />;

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex overflow-x-auto rounded-lg border bg-card shadow-sm">
        <div className="sticky left-0 z-20 w-14 shrink-0 border-r bg-background">
          <div className="h-11 border-b" />
          <div className={GRID_BODY_CLASS} style={{ height: totalHeight }}>
            {marks.map((minute) => (
              <span
                key={minute}
                className="absolute inset-x-0 -translate-y-1/2 pr-1.5 text-right text-caption text-muted-foreground"
                style={{ top: minutesToTopPx(minute, range, PIXELS_PER_HOUR) }}
              >
                {minutesToTimeInput(minute)}
              </span>
            ))}
          </div>
        </div>

        {columns.map((column) => (
          <ColumnView
            key={column.key}
            column={column}
            range={range}
            marks={marks}
            totalHeight={totalHeight}
            timezone={timezone}
            nowMinute={column.isToday ? nowMinute : null}
            minutesByAppointment={minutesByAppointment}
            minutesByBlock={minutesByBlock}
            onAppointmentClick={(appointment) => {
              if (!justDraggedRef.current) onAppointmentClick(appointment);
            }}
            onEmptySlotClick={onEmptySlotClick}
          />
        ))}
      </div>
    </DndContext>
  );
}

function ColumnView({
  column,
  range,
  marks,
  totalHeight,
  timezone,
  nowMinute,
  minutesByAppointment,
  minutesByBlock,
  onAppointmentClick,
  onEmptySlotClick,
}: {
  column: GridColumn;
  range: DayRange;
  marks: number[];
  totalHeight: number;
  timezone: string;
  nowMinute: number | null;
  minutesByAppointment: Map<string, MinuteRange>;
  minutesByBlock: Map<string, MinuteRange>;
  onAppointmentClick: (appointment: AppointmentDto) => void;
  onEmptySlotClick: (column: GridColumn, minute: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key, data: { column } });
  const wh = column.workingHours;
  const top = (minute: number) => minutesToTopPx(minute, range, PIXELS_PER_HOUR);

  return (
    <div className="min-w-44 flex-1 border-r last:border-r-0">
      <div className="sticky top-0 z-10 flex h-11 items-center gap-2 border-b bg-background px-2">{column.header}</div>

      <div
        ref={setNodeRef}
        className={cn(GRID_BODY_CLASS, "cursor-copy", isOver && "bg-primary/5")}
        style={{ height: totalHeight }}
        onClick={(event) => {
          // Só cliques no fundo da coluna criam agendamento (blocos e bloqueios param a propagação).
          const rect = event.currentTarget.getBoundingClientRect();
          onEmptySlotClick(column, pxToMinute(event.clientY - rect.top, range, PIXELS_PER_HOUR));
        }}
        title="Clique para agendar neste horário"
      >
        {marks.map((minute) => (
          <div key={minute} className="pointer-events-none absolute inset-x-0 border-t border-border/60" style={{ top: top(minute) }} />
        ))}

        {!wh ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-muted/30 text-center text-caption text-muted-foreground">
            Sem expediente
          </div>
        ) : (
          <>
            {wh.startMinute > range.rangeStartMinute ? (
              <div className="pointer-events-none absolute inset-x-0 bg-muted/30" style={{ top: 0, height: top(wh.startMinute) }} />
            ) : null}
            {wh.endMinute < range.rangeEndMinute ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-muted/30" style={{ top: top(wh.endMinute) }} />
            ) : null}
            {wh.breakStartMinute != null && wh.breakEndMinute != null ? (
              <div
                className="pointer-events-none absolute inset-x-0 bg-muted/30"
                style={{
                  top: top(wh.breakStartMinute),
                  height: minutesToHeightPx(wh.breakStartMinute, wh.breakEndMinute, PIXELS_PER_HOUR, 0),
                }}
              />
            ) : null}
          </>
        )}

        {column.isBeforeToday || (nowMinute != null && nowMinute > range.rangeStartMinute) ? (
          // Tempo que já passou: não aceita novo agendamento (regra do servidor, 15 min de tolerância).
          <div
            className="pointer-events-none absolute inset-x-0 top-0 bg-muted/60"
            style={{
              height: column.isBeforeToday
                ? totalHeight
                : top(Math.min(nowMinute ?? range.rangeStartMinute, range.rangeEndMinute)),
            }}
            aria-hidden
          />
        ) : null}

        {column.closedReason ? (
          // Clique continua chegando ao espaço vazio: o encaixe avisa e pede "mesmo assim".
          <div
            className="pointer-events-none absolute inset-0 flex justify-center pt-2"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, var(--color-muted), var(--color-muted) 6px, transparent 6px, transparent 12px)",
            }}
          >
            <span className="flex h-fit max-w-full items-center gap-1 truncate rounded-md bg-card px-2 py-1 text-caption font-medium text-muted-foreground ring-1 ring-border">
              <Ban className="size-3 shrink-0" aria-hidden />
              Fechado: {column.closedReason}
            </span>
          </div>
        ) : null}

        {column.timeBlocks.map((block) => {
          const visible = clampToRange(minutesByBlock.get(`${column.key}:${block.id}`)!, range);
          if (!visible) return null;
          return (
            <div
              key={block.id}
              className="absolute inset-x-1 flex cursor-not-allowed items-start gap-1 overflow-hidden rounded-md px-2 py-1 text-caption text-muted-foreground ring-1 ring-border"
              style={{
                top: top(visible.startMinute),
                height: minutesToHeightPx(visible.startMinute, visible.endMinute, PIXELS_PER_HOUR),
                backgroundImage:
                  "repeating-linear-gradient(45deg, var(--color-muted), var(--color-muted) 6px, transparent 6px, transparent 12px)",
              }}
              title={block.reason ?? "Bloqueado"}
              onClick={(event) => event.stopPropagation()}
            >
              <Ban className="mt-0.5 size-3 shrink-0" />
              <span className="truncate">{block.reason ?? "Bloqueado"}</span>
            </div>
          );
        })}

        {column.appointments.map((appointment) => (
          <AppointmentBlock
            key={appointment.id}
            appointment={appointment}
            column={column}
            minutes={minutesByAppointment.get(appointment.id)!}
            range={range}
            timezone={timezone}
            onClick={onAppointmentClick}
          />
        ))}

        {nowMinute != null && nowMinute >= range.rangeStartMinute && nowMinute <= range.rangeEndMinute ? (
          <div
            className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-destructive"
            style={{ top: top(nowMinute) }}
            aria-hidden
          >
            <span className="absolute -top-1.5 -left-1 size-3 rounded-full bg-destructive" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AppointmentBlock({
  appointment,
  column,
  minutes,
  range,
  timezone,
  onClick,
}: {
  appointment: AppointmentDto;
  column: GridColumn;
  minutes: MinuteRange;
  range: DayRange;
  timezone: string;
  onClick: (appointment: AppointmentDto) => void;
}) {
  const canDrag = RESCHEDULABLE_STATUSES.includes(appointment.status);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appointment.id,
    data: { appointment, column },
    disabled: !canDrag,
  });
  const timeLabel = `${formatTime(appointment.startAt, timezone)}–${formatTime(appointment.endAt, timezone)}`;
  const height = minutesToHeightPx(minutes.startMinute, minutes.endMinute, PIXELS_PER_HOUR, MIN_APPOINTMENT_HEIGHT_PX);
  // Abaixo de ~3 linhas de texto, o bloco vira uma linha só (hora · cliente).
  const isCompact = height < COMPACT_BLOCK_HEIGHT_PX;

  return (
    <button
      ref={setNodeRef}
      type="button"
      // Só blocos arrastáveis recebem os atributos do dnd-kit: nos demais
      // (concluído, cancelado...) ele poria aria-disabled="true", e o bloco
      // continua clicável (abre o drawer) — leitor de tela diria "desativado".
      {...(canDrag ? { ...listeners, ...attributes } : {})}
      title={`${timeLabel} · ${appointment.client.name} · ${appointment.service.name} (${STATUS_LABELS[appointment.status]})${canDrag ? " — arraste para remarcar" : ""}`}
      className={cn(
        "absolute inset-x-1 flex flex-col overflow-hidden rounded-md px-2 py-1 text-left text-caption leading-tight shadow-sm transition-shadow hover:z-20 hover:shadow-md focus-visible:z-20 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        STATUS_BLOCK_CLASSES[appointment.status],
        canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        isDragging && "z-30 opacity-80 shadow-lg",
      )}
      style={{
        top: minutesToTopPx(minutes.startMinute, range, PIXELS_PER_HOUR),
        height,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClick(appointment);
      }}
    >
      {isCompact ? (
        <span className="truncate">
          <span className="inline-flex items-center gap-1 align-middle">
            <PaymentIndicator status={appointment.paymentStatus} />
            <SeriesIndicator seriesId={appointment.seriesId} />
            <span className="font-semibold">{formatTime(appointment.startAt, timezone)}</span>
          </span>{" "}
          · {appointment.client.name}
          <span className="block truncate opacity-80">{appointment.service.name}</span>
        </span>
      ) : (
        <>
          <span className="flex items-center gap-1 truncate font-semibold">
            {timeLabel}
            <PaymentIndicator status={appointment.paymentStatus} />
            <SeriesIndicator seriesId={appointment.seriesId} />
          </span>
          <span className="truncate">{appointment.client.name}</span>
          <span className="truncate opacity-80">{appointment.service.name}</span>
        </>
      )}
    </button>
  );
}

function ScheduleGridSkeleton({ columnCount }: { columnCount: number }) {
  return (
    <div className="flex gap-2 overflow-hidden rounded-lg border bg-card p-2 shadow-sm" aria-busy aria-label="Carregando agenda">
      {Array.from({ length: Math.max(columnCount, 3) }, (_, i) => (
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
