"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { useAdminShell } from "@/components/admin/admin-shell-context";
import { ProfessionalAvatar } from "@/components/admin/professional-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { emptyLabel } from "@/config/vertical";
import { useVertical } from "@/config/vertical-context";
import {
  addDaysToIsoDate,
  formatDateLabel,
  formatWeekdayShort,
  localDayRangeUtc,
  localMinutesToUtc,
  todayInTimeZone,
  utcToLocalDate,
  weekdayOfLocalDate,
} from "@/lib/date";
import { getProfessionalColor } from "@/lib/professional-colors";
import { minutesToTimeInput } from "@/lib/weekday";
import { PAST_MESSAGE, isInPast } from "@/server/modules/appointment/admin-booking-rules";

import { AgendaDayList } from "./agenda-day-list";
import { AppointmentDrawer } from "./appointment-drawer";
import { ScheduleGrid, type AppointmentDrop, type GridColumn } from "./schedule-grid";
import { isWithinWorkingHours, weekDates } from "./schedule-grid-math";
import type { AppointmentDto, ProfessionalOption, TimeBlockDto } from "./types";

type View = "day" | "week";
const ALL = "all";

export function AgendaView({
  timezone,
  professionals,
  initialDate,
}: {
  timezone: string;
  professionals: ProfessionalOption[];
  initialDate?: string;
}) {
  const { terms } = useVertical();
  const { appointmentsVersion, setContextDate, openNewAppointment } = useAdminShell();
  const today = useMemo(() => todayInTimeZone(timezone), [timezone]);
  const [date, setDate] = useState(() => initialDate ?? today);
  const [view, setView] = useState<View>("day");
  const [dayFilter, setDayFilter] = useState<string>(ALL);
  const [weekProfessionalId, setWeekProfessionalId] = useState(professionals[0]?.id ?? "");
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlockDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingDrop, setPendingDrop] = useState<AppointmentDrop | null>(null);

  const week = useMemo(() => weekDates(date), [date]);
  const rangeStart = view === "week" ? week[0] : date;
  const rangeEnd = view === "week" ? week[6] : date;

  const loadAppointments = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const params = new URLSearchParams({ startDate: rangeStart, endDate: rangeEnd });
      if (view === "week" && weekProfessionalId) params.set("professionalId", weekProfessionalId);
      const response = await fetch(`/api/admin/appointments?${params.toString()}`);
      if (!response.ok) throw new Error("load failed");
      const data = await response.json();
      setAppointments(data.appointments);
      setTimeBlocks(data.timeBlocks);
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
    // appointmentsVersion: recarrega quando um agendamento é criado de qualquer tela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeStart, rangeEnd, view, weekProfessionalId, appointmentsVersion]);

  useEffect(() => {
    // Busca ao montar/trocar de período; loadAppointments seta isLoading antes do
    // fetch — padrão de efeito de busca com flag de carregamento, não um bug.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    setContextDate(date);
    return () => setContextDate(undefined);
  }, [date, setContextDate]);

  const columns: GridColumn[] = useMemo(() => {
    const inDay = (startISO: string, endISO: string, columnDate: string) => {
      const day = localDayRangeUtc(columnDate, timezone);
      return new Date(startISO) < day.end && new Date(endISO) > day.start;
    };
    const buildColumn = (professional: ProfessionalOption, columnDate: string, header: GridColumn["header"]): GridColumn => ({
      key: `${professional.id}:${columnDate}`,
      professionalId: professional.id,
      date: columnDate,
      header,
      workingHours: professional.workingHours.find((wh) => wh.weekday === weekdayOfLocalDate(columnDate)) ?? null,
      appointments: appointments.filter(
        (a) => a.professional.id === professional.id && utcToLocalDate(new Date(a.startAt), timezone) === columnDate,
      ),
      timeBlocks: timeBlocks.filter((b) => b.professionalId === professional.id && inDay(b.startAt, b.endAt, columnDate)),
      isToday: columnDate === today,
      isBeforeToday: columnDate < today,
    });

    if (view === "week") {
      const professional = professionals.find((p) => p.id === weekProfessionalId);
      if (!professional) return [];
      const dotClass = getProfessionalColor(professional.color)?.dotClass;
      return week.map((columnDate) =>
        buildColumn(
          professional,
          columnDate,
          <>
            {dotClass ? <span className={`size-2 shrink-0 rounded-full ${dotClass}`} aria-hidden /> : null}
            <span className={columnDate === today ? "text-sm font-semibold text-primary" : "text-sm font-medium"}>
              <span className="capitalize">{formatWeekdayShort(columnDate, timezone)}</span> {columnDate.slice(8, 10)}/
              {columnDate.slice(5, 7)}
            </span>
          </>,
        ),
      );
    }

    return professionals
      .filter((p) => dayFilter === ALL || p.id === dayFilter)
      .map((professional) =>
        buildColumn(
          professional,
          date,
          <>
            <ProfessionalAvatar
              name={professional.name}
              photoUrl={professional.photoUrl}
              color={professional.color}
              size="sm"
            />
            <span className="truncate text-sm font-medium">{professional.name}</span>
          </>,
        ),
      );
  }, [view, professionals, weekProfessionalId, dayFilter, week, date, today, timezone, appointments, timeBlocks]);

  function step(direction: 1 | -1) {
    setDate((d) => addDaysToIsoDate(d, direction * (view === "week" ? 7 : 1)));
  }

  function handleDrop(drop: AppointmentDrop) {
    const professional = professionals.find((p) => p.id === drop.column.professionalId);
    if (!professional?.services.some((s) => s.id === drop.appointment.service.id)) {
      toast.error(`${professional?.name ?? "Esse cadastro"} não realiza ${drop.appointment.service.name}.`);
      return;
    }
    const startAt = localMinutesToUtc(drop.column.date, drop.startMinute, timezone);
    const endAt = localMinutesToUtc(drop.column.date, drop.endMinute, timezone);
    if (isInPast(startAt, new Date())) {
      toast.error(PAST_MESSAGE);
      return;
    }
    const blocked = drop.column.timeBlocks.some((b) => new Date(b.startAt) < endAt && new Date(b.endAt) > startAt);
    if (blocked) {
      toast.error("Esse horário está bloqueado na agenda.");
      return;
    }
    if (!isWithinWorkingHours(drop.column.workingHours, drop.startMinute, drop.endMinute)) {
      setPendingDrop(drop);
      return;
    }
    void commitDrop(drop, false);
  }

  function handleEmptySlotClick(column: GridColumn, minute: number) {
    if (isInPast(localMinutesToUtc(column.date, minute, timezone), new Date())) {
      toast.error(PAST_MESSAGE);
      return;
    }
    openNewAppointment({ date: column.date, professionalId: column.professionalId, time: minutesToTimeInput(minute) });
  }

  /** `allowOutsideHours`: o dono confirmou no modal "Fora do expediente". */
  async function commitDrop(drop: AppointmentDrop, allowOutsideHours: boolean) {
    const professional = professionals.find((p) => p.id === drop.column.professionalId);
    if (!professional) return;
    const startAt = localMinutesToUtc(drop.column.date, drop.startMinute, timezone);
    const endAt = localMinutesToUtc(drop.column.date, drop.endMinute, timezone);
    const previous = appointments;
    // Otimista: move na tela já; se o servidor recusar, volta e avisa.
    setAppointments((list) =>
      list.map((a) =>
        a.id === drop.appointment.id
          ? {
              ...a,
              startAt: startAt.toISOString(),
              endAt: endAt.toISOString(),
              professional: { id: professional.id, name: professional.name },
            }
          : a,
      ),
    );
    const response = await fetch(`/api/admin/appointments/${drop.appointment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startAt: startAt.toISOString(), professionalId: professional.id, allowOutsideHours }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setAppointments(previous);
      toast.error(data?.error ?? "Não foi possível remarcar.");
      return;
    }
    toast.success(`Remarcado para ${minutesToTimeInput(drop.startMinute)} com ${professional.name}.`);
    void loadAppointments();
  }

  if (professionals.length === 0) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
        <h1 className="text-page-title font-bold">Agenda</h1>
        <p className="text-sm text-muted-foreground">{emptyLabel(terms.professional)}</p>
      </main>
    );
  }

  const dateLabel =
    view === "week"
      ? `${formatShortDate(week[0], timezone)} – ${formatShortDate(week[6], timezone)}`
      : formatDateLabel(date, timezone);
  // No celular a agenda é sempre a lista do dia (as abas Dia/Semana ficam ocultas).
  const dayAppointments = appointments.filter((a) => utcToLocalDate(new Date(a.startAt), timezone) === date);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-page-title font-bold">Agenda</h1>
        <Tabs value={view} onValueChange={(value) => setView(value as View)} className="hidden sm:flex">
          <TabsList>
            <TabsTrigger value="day">Dia</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Uma agenda só (profissional logado ou negócio de uma pessoa): sem seletor. */}
        <div className={professionals.length > 1 ? "hidden sm:block" : "hidden"}>
          {view === "day" ? (
            <Select value={dayFilter} onValueChange={(value) => setDayFilter(value ?? ALL)}>
              <SelectTrigger aria-label={`Filtrar ${terms.professional.plural.toLowerCase()}`} className="min-w-44">
                <SelectValue>
                  {(value: string) => (value === ALL ? "Todas as agendas" : professionals.find((p) => p.id === value)?.name)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas as agendas</SelectItem>
                {professionals.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Select value={weekProfessionalId} onValueChange={(value) => value && setWeekProfessionalId(value)}>
              <SelectTrigger aria-label={terms.professional.singular} className="min-w-44">
                <SelectValue>{(value: string) => professionals.find((p) => p.id === value)?.name}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {professionals.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex w-full items-center gap-1 sm:ml-auto sm:w-auto">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={view === "week" ? "Semana anterior" : "Dia anterior"}
            onClick={() => step(-1)}
          >
            <ChevronLeft />
          </Button>
          <p className="flex-1 text-center text-sm font-medium first-letter:uppercase sm:min-w-56 sm:flex-none">{dateLabel}</p>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={view === "week" ? "Próxima semana" : "Próximo dia"}
            onClick={() => step(1)}
          >
            <ChevronRight />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDate(today)} disabled={date === today}>
            Hoje
          </Button>
        </div>
      </div>

      {loadError ? (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
          <span className="flex-1">Não foi possível carregar a agenda.</span>
          <Button size="sm" variant="outline" onClick={() => void loadAppointments()}>
            Tentar de novo
          </Button>
        </div>
      ) : null}

      <div className="hidden sm:block">
        <ScheduleGrid
          columns={columns}
          timezone={timezone}
          isLoading={isLoading}
          onAppointmentClick={(appointment) => setSelectedId(appointment.id)}
          onEmptySlotClick={handleEmptySlotClick}
          onAppointmentDrop={handleDrop}
        />
        <p className="mt-2 text-caption text-muted-foreground">
          Clique num espaço vazio para agendar · arraste um agendamento para remarcar.
        </p>
      </div>

      <div className="sm:hidden">
        <AgendaDayList
          professionals={professionals}
          appointments={dayAppointments}
          timeBlocks={timeBlocks.filter(
            (b) =>
              new Date(b.startAt) < localDayRangeUtc(date, timezone).end &&
              new Date(b.endAt) > localDayRangeUtc(date, timezone).start,
          )}
          timezone={timezone}
          isLoading={isLoading}
          onAppointmentClick={(appointment) => setSelectedId(appointment.id)}
        />
      </div>

      <AppointmentDrawer
        appointmentId={selectedId}
        timezone={timezone}
        professionals={professionals}
        onClose={() => setSelectedId(null)}
        onChanged={() => void loadAppointments()}
      />

      <Dialog open={pendingDrop != null} onOpenChange={(open) => !open && setPendingDrop(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fora do expediente</DialogTitle>
            <DialogDescription>
              {pendingDrop
                ? pendingDrop.column.workingHours
                  ? `${minutesToTimeInput(pendingDrop.startMinute)}–${minutesToTimeInput(pendingDrop.endMinute)} fica fora do expediente. Mover mesmo assim?`
                  : "Não há expediente neste dia. Mover mesmo assim?"
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDrop(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                const drop = pendingDrop;
                setPendingDrop(null);
                if (drop) void commitDrop(drop, true);
              }}
            >
              Mover mesmo assim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function formatShortDate(dateISO: string, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone, day: "2-digit", month: "short" })
    .format(localMinutesToUtc(dateISO, 12 * 60, timeZone))
    .replace(".", "");
}
