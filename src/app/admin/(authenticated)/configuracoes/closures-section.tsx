"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarOff, PartyPopper, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { todayInTimeZone } from "@/lib/date";
import { upcomingHolidays, type ClosureRange } from "@/server/modules/business/closure-rules";

interface Closure extends ClosureRange {
  id: string;
}

interface Affected {
  id: string;
  startAt: string;
  clientName: string;
  professionalName: string;
}

/** "2026-12-25" → "25/12/2026". */
function formatDate(dateISO: string): string {
  const [year, month, day] = dateISO.split("-");
  return `${day}/${month}/${year}`;
}

function describeRange(closure: ClosureRange): string {
  if (closure.startDate === closure.endDate) return formatDate(closure.startDate);
  return `${formatDate(closure.startDate).slice(0, 5)} a ${formatDate(closure.endDate)}`;
}

/**
 * Dias em que o negócio inteiro fecha (feriados, férias coletivas). Sem horários
 * na página pública; a agenda mostra o dia hachurado; encaixe pede confirmação.
 * Fechar não cancela nada: os agendamentos já marcados aparecem para remarcar.
 */
export function ClosuresSection({ timezone }: { timezone: string }) {
  const [closures, setClosures] = useState<Closure[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [affected, setAffected] = useState<Affected[]>([]);
  const [isHolidaysOpen, setIsHolidaysOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Closure | null>(null);
  const today = todayInTimeZone(timezone);

  async function fetchClosures(): Promise<Closure[] | null> {
    try {
      const response = await fetch("/api/admin/business/closures");
      if (!response.ok) return null;
      return ((await response.json()) as { closures: Closure[] }).closures;
    } catch {
      return null;
    }
  }

  async function load() {
    setLoadError(false);
    const result = await fetchClosures();
    if (result) setClosures(result);
    else setLoadError(true);
  }

  useEffect(() => {
    let cancelled = false;
    void fetchClosures().then((result) => {
      if (cancelled) return;
      if (result) setClosures(result);
      else setLoadError(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function create(ranges: ClosureRange[]): Promise<boolean> {
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/business/closures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closures: ranges }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setFormError(data?.error ?? "Não foi possível salvar");
        return false;
      }
      const created = (data.created as Closure[]).length;
      toast.success(created === 0 ? "Esses dias já estavam fechados" : created === 1 ? "Dia fechado" : `${created} dias fechados`);
      setAffected(data.affected as Affected[]);
      await load();
      return true;
    } catch {
      setFormError("Sem conexão. Tente de novo.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (await create([{ startDate, endDate: endDate || startDate, reason }])) {
      setStartDate("");
      setEndDate("");
      setReason("");
    }
  }

  async function handleDelete(closure: Closure) {
    const response = await fetch(`/api/admin/business/closures/${closure.id}`, { method: "DELETE" });
    const data = await response.json().catch(() => null);
    setToDelete(null);
    if (!response.ok) {
      toast.error(data?.error ?? "Não foi possível reabrir");
      return;
    }
    toast.success(`${describeRange(closure)} reaberto`);
    await load();
  }

  return (
    <Card id="fechados" className="scroll-mt-20">
      <CardHeader>
        <CardTitle className="text-section-title">Dias fechados</CardTitle>
        <CardDescription>
          Feriados e férias: nesses dias a página não oferece horários e a agenda mostra o dia fechado. Agendamentos já marcados
          não são cancelados: você vê a lista para remarcar.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {affected.length > 0 ? (
          <div role="status" className="flex flex-col gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden />
              {affected.length === 1 ? "1 agendamento já marcado nesse período" : `${affected.length} agendamentos já marcados nesse período`}: remarque ou avise o cliente.
            </p>
            <ul className="flex flex-col gap-1 text-muted-foreground">
              {affected.map((appointment) => (
                <li key={appointment.id}>
                  <Link
                    href={`/admin/agenda?date=${new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date(appointment.startAt))}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, dateStyle: "short", timeStyle: "short" }).format(new Date(appointment.startAt))}
                  </Link>{" "}
                  · {appointment.clientName} · {appointment.professionalName}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {loadError ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
            <span className="text-destructive">Não foi possível carregar os dias fechados.</span>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Tentar de novo
            </Button>
          </div>
        ) : closures === null ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : closures.length === 0 ? (
          <p className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            <CalendarOff className="size-4 shrink-0" aria-hidden />
            Nenhum dia fechado daqui para frente.
          </p>
        ) : (
          <ul className="flex flex-col divide-y rounded-lg border">
            {closures.map((closure) => (
              <li key={closure.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span>
                  <span className="font-medium">{describeRange(closure)}</span>{" "}
                  <span className="text-muted-foreground">· {closure.reason}</span>
                </span>
                <Button variant="ghost" size="icon-sm" aria-label={`Reabrir ${describeRange(closure)}`} onClick={() => setToDelete(closure)}>
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <Button variant="outline" className="w-full sm:w-fit" onClick={() => setIsHolidaysOpen(true)}>
          <PartyPopper />
          Adicionar feriados nacionais
        </Button>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <p className="text-sm font-medium">Fechar um dia ou período</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="closure-start">Data</Label>
              <Input id="closure-start" type="date" min={today} required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="closure-end">Até (opcional)</Label>
              <Input id="closure-end" type="date" min={startDate || today} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="closure-reason">Motivo</Label>
              <Input
                id="closure-reason"
                required
                maxLength={60}
                placeholder="Ex.: Férias coletivas"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
          <p className="text-caption text-muted-foreground">O motivo aparece para o cliente na página de reservas.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Salvando..." : "Fechar estes dias"}
            </Button>
            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}
          </div>
        </form>
      </CardContent>

      <HolidaysDialog
        open={isHolidaysOpen}
        today={today}
        existing={closures ?? []}
        isSaving={isSaving}
        onOpenChange={setIsHolidaysOpen}
        onConfirm={async (ranges) => {
          if (await create(ranges)) setIsHolidaysOpen(false);
        }}
      />

      <Dialog open={toDelete != null} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reabrir {toDelete ? describeRange(toDelete) : ""}?</DialogTitle>
            <DialogDescription>Os horários desse período voltam a aparecer na página de reservas.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Cancelar
            </Button>
            <Button onClick={() => toDelete && void handleDelete(toDelete)}>Reabrir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/** Feriados dos próximos 12 meses: os nacionais já vêm marcados; Carnaval e Corpus Christi (facultativos), não. */
function HolidaysDialog({
  open,
  today,
  existing,
  isSaving,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  today: string;
  existing: ClosureRange[];
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (ranges: ClosureRange[]) => void;
}) {
  const holidays = upcomingHolidays(today);
  const isAdded = (date: string) => existing.some((closure) => closure.startDate === date && closure.endDate === date);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Ao abrir: marca os nacionais que ainda não foram adicionados.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setSelected(new Set(holidays.filter((h) => !h.optional && !isAdded(h.date)).map((h) => h.date)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggle(date: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Feriados nacionais</DialogTitle>
          <DialogDescription>Próximos 12 meses. Desmarque os dias em que você vai abrir.</DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2">
          {holidays.map((holiday) => {
            const added = isAdded(holiday.date);
            return (
              <li key={holiday.date}>
                <Label className="flex items-center gap-3 text-sm font-normal">
                  <Checkbox checked={added || selected.has(holiday.date)} disabled={added} onCheckedChange={() => toggle(holiday.date)} />
                  <span className="w-20 shrink-0 font-medium tabular-nums">{formatDate(holiday.date)}</span>
                  <span>
                    {holiday.name}
                    {holiday.optional ? <span className="text-muted-foreground"> · ponto facultativo</span> : null}
                    {added ? <span className="text-muted-foreground"> · já fechado</span> : null}
                  </span>
                </Label>
              </li>
            );
          })}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={isSaving || selected.size === 0}
            onClick={() =>
              onConfirm(
                holidays
                  .filter((h) => selected.has(h.date))
                  .map((h) => ({ startDate: h.date, endDate: h.date, reason: h.name })),
              )
            }
          >
            {isSaving ? "Salvando..." : selected.size === 1 ? "Adicionar 1 feriado" : `Adicionar ${selected.size} feriados`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
