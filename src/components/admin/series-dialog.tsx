"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CircleCheck, Repeat } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SERIES_FREQUENCIES, SERIES_MAX_OCCURRENCES, describeFrequency } from "@/server/modules/appointment/series-rules";

interface Occurrence {
  date: string;
  startAt: string;
  problem: string | null;
}

const COUNT_OPTIONS = Array.from({ length: SERIES_MAX_OCCURRENCES - 1 }, (_, i) => i + 2);

/**
 * "Repetir este horário" (ou "Renovar", a partir da última data de uma série):
 * frequência e quantidade, prévia de cada data (livre ou o motivo) e cria só as
 * livres. A 1ª data é o próprio agendamento; as novas nascem "agendado".
 */
export function SeriesDialog({
  appointmentId,
  open,
  timezone,
  renewFrequency = null,
  onOpenChange,
  onCreated,
}: {
  appointmentId: string | null;
  open: boolean;
  timezone: string;
  /** Renovar: a frequência é a da série (não muda). */
  renewFrequency?: number | null;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [frequencyWeeks, setFrequencyWeeks] = useState<number>(renewFrequency ?? 1);
  const [count, setCount] = useState(renewFrequency ? 5 : 8);
  const [occurrences, setOccurrences] = useState<Occurrence[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const renewing = renewFrequency != null;

  useEffect(() => {
    if (!open || !appointmentId) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      fetch(`/api/admin/appointments/${appointmentId}/series/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frequencyWeeks: renewFrequency ?? frequencyWeeks, count }),
      })
        .then(async (response) => {
          const data = await response.json().catch(() => null);
          if (cancelled) return;
          if (!response.ok) {
            setError(data?.error ?? "Não foi possível montar as datas");
            setOccurrences([]);
            return;
          }
          setError(null);
          setOccurrences(data.occurrences as Occurrence[]);
        })
        .catch(() => !cancelled && setError("Sem conexão. Tente de novo."));
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, appointmentId, frequencyWeeks, count, renewFrequency]);

  const free = occurrences?.filter((o) => !o.problem).length ?? 0;
  const format = (iso: string) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, weekday: "short", day: "2-digit", month: "2-digit", year: "2-digit" })
      .format(new Date(iso))
      .replace(".", "");

  async function create() {
    if (!appointmentId) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/appointments/${appointmentId}/series`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frequencyWeeks: renewFrequency ?? frequencyWeeks, count }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Não foi possível criar os horários");
        return;
      }
      const created = (data.created as string[]).length;
      const skipped = (data.skipped as unknown[]).length;
      toast.success(
        `${created} ${created === 1 ? "horário criado" : "horários criados"}${skipped > 0 ? ` · ${skipped} ${skipped === 1 ? "data pulada" : "datas puladas"}` : ""}`,
      );
      onOpenChange(false);
      onCreated();
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="size-4 text-primary" aria-hidden />
            {renewing ? "Renovar horário fixo" : "Repetir este horário"}
          </DialogTitle>
          <DialogDescription>
            {renewing
              ? `Mais datas ${describeFrequency(renewFrequency)}, no mesmo dia da semana e horário.`
              : "Mesmo dia da semana, horário e serviço. Cada data vira um agendamento: o cliente cancela só a semana que não puder pelo link."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          {!renewing ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="series-frequency">Repetir</Label>
              <Select value={String(frequencyWeeks)} onValueChange={(value) => setFrequencyWeeks(Number(value))}>
                <SelectTrigger id="series-frequency" className="w-full">
                  <SelectValue>{(value: string) => describeFrequency(Number(value)).replace(/^./, (c) => c.toUpperCase())}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SERIES_FREQUENCIES.map((weeks) => (
                    <SelectItem key={weeks} value={String(weeks)}>
                      {describeFrequency(weeks).replace(/^./, (c) => c.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="series-count">{renewing ? "Quantas datas a mais" : "Quantas datas (contando esta)"}</Label>
            <Select value={String(count)} onValueChange={(value) => setCount(Number(value))}>
              <SelectTrigger id="series-count" className="w-full">
                <SelectValue>{(value: string) => (renewing ? `${Number(value) - 1} datas` : `${value} datas`)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {COUNT_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {renewing ? `${option - 1} datas` : `${option} datas`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {occurrences === null ? (
          <p className="text-sm text-muted-foreground">Montando as datas…</p>
        ) : occurrences.length > 0 ? (
          <ul className="flex flex-col divide-y rounded-lg border text-sm" aria-label="Datas da repetição">
            {occurrences.map((occurrence) => (
              <li key={occurrence.date} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="capitalize tabular-nums">{format(occurrence.startAt)}</span>
                {occurrence.problem ? (
                  <span className="flex items-center gap-1 text-caption text-warning">
                    <AlertTriangle className="size-3.5" aria-hidden />
                    {occurrence.problem}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-caption text-success">
                    <CircleCheck className="size-3.5" aria-hidden />
                    Livre
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : null}
        {occurrences && occurrences.length > 0 && free < occurrences.length ? (
          <p className="text-caption text-muted-foreground">
            As datas indisponíveis ficam de fora; dá para marcá-las depois em outro horário, pela agenda.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={isSaving || free === 0} onClick={() => void create()}>
            {isSaving ? "Criando…" : free === 1 ? "Criar 1 horário" : `Criar ${free} horários`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
