"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarOff, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { buildTimeBlockRange, describeTimeBlock } from "@/server/modules/professional/time-block-rules";
import { cn } from "cn";

interface TimeBlockDto {
  id: string;
  startAt: string;
  endAt: string;
  reason: string | null;
}

/**
 * Folgas e ausências de UMA pessoa (folga, médico, férias), num cartão à
 * parte do formulário: "Adicionar" grava na hora, sem o "Salvar" do cadastro.
 * Feriado ou recesso de todos fica em Configurações › Dias fechados.
 * Sem `professionalName` (plano Solo, página Folgas): o título fica sem o nome.
 */
export function TimeBlocksManager({
  professionalId,
  professionalName,
  timezone,
}: {
  professionalId: string;
  professionalName?: string;
  timezone: string;
}) {
  const [timeBlocks, setTimeBlocks] = useState<TimeBlockDto[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [mode, setMode] = useState<"days" | "hours">("days");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/professionals/${professionalId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { professional: { timeBlocks: TimeBlockDto[] } }) => {
        if (!cancelled) {
          // Só o que ainda não passou: o histórico de folgas não ajuda a decidir nada.
          const now = Date.now();
          setTimeBlocks(data.professional.timeBlocks.filter((block) => new Date(block.endAt).getTime() > now));
          setLoadError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [professionalId, reloadKey]);

  async function handleAdd() {
    setError(null);
    let range: { startAt: Date; endAt: Date };
    try {
      range = buildTimeBlockRange(
        mode === "days" ? { mode, startDate, endDate } : { mode, date: startDate, startTime, endTime },
        timezone,
      );
    } catch (rangeError) {
      setError((rangeError as Error).message);
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/professionals/${professionalId}/time-blocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startAt: range.startAt.toISOString(), endAt: range.endAt.toISOString(), reason: reason.trim() || undefined }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Não foi possível adicionar");
        return;
      }
      toast.success(`Ausência adicionada: ${describeTimeBlock(range.startAt, range.endAt, timezone)}.`);
      setStartDate("");
      setEndDate("");
      setReason("");
      setReloadKey((key) => key + 1);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(block: TimeBlockDto) {
    const response = await fetch(`/api/admin/professionals/${professionalId}/time-blocks/${block.id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Não foi possível remover");
      return;
    }
    toast.success("Ausência removida. Os horários voltam a aparecer.");
    setReloadKey((key) => key + 1);
  }

  return (
    <section aria-labelledby="time-blocks-title" className="flex max-w-2xl flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-col gap-1">
        <h2 id="time-blocks-title" className="text-section-title font-semibold">
          {professionalName ? `Folgas e ausências de ${professionalName}` : "Folgas e ausências"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Folga, médico, férias: nesses dias e horários a agenda fica bloqueada e a página não oferece horário nesse período.
          {" "}
          {professionalName ? "Feriado ou recesso de todos?" : "Feriado ou recesso do negócio?"}{" "}
          <Link href="/admin/configuracoes#fechados" className="font-medium text-primary underline-offset-4 hover:underline">
            Use Dias fechados
          </Link>
          .
        </p>
      </div>

      {loadError ? (
        <div className="flex items-center gap-2 text-sm text-destructive">
          Não foi possível carregar as ausências.
          <Button type="button" size="sm" variant="ghost" onClick={() => setReloadKey((key) => key + 1)}>
            <RotateCcw />
            Tentar de novo
          </Button>
        </div>
      ) : timeBlocks === null ? (
        <div className="flex flex-col gap-1" aria-busy>
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-2/3" />
        </div>
      ) : timeBlocks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma ausência marcada daqui para frente.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {timeBlocks.map((block) => (
            <li key={block.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 p-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <CalendarOff className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0">
                  <span className="font-medium">{describeTimeBlock(new Date(block.startAt), new Date(block.endAt), timezone)}</span>
                  {block.reason ? <span className="text-muted-foreground"> · {block.reason}</span> : null}
                </span>
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={() => void handleDelete(block)} aria-label={`Remover ausência de ${describeTimeBlock(new Date(block.startAt), new Date(block.endAt), timezone)}`}>
                <Trash2 />
                Remover
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-3">
        <div role="radiogroup" aria-label="Tipo de ausência" className="flex flex-wrap gap-2">
          {(
            [
              ["days", "Dia inteiro (ou vários dias)"],
              ["hours", "Só algumas horas"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                "min-h-9 rounded-full border px-3 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                mode === value ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="block-start-date">{mode === "days" ? "De" : "Data"}</Label>
            <Input id="block-start-date" type="date" className="w-40" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          {mode === "days" ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="block-end-date">Até (opcional)</Label>
              <Input id="block-end-date" type="date" className="w-40" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="block-start-time">Das</Label>
                <Input id="block-start-time" type="time" className="w-28" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="block-end-time">Às</Label>
                <Input id="block-end-time" type="time" className="w-28" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </>
          )}
          <div className="flex min-w-48 flex-1 flex-col gap-1.5">
            <Label htmlFor="block-reason">Motivo (opcional)</Label>
            <Input id="block-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Folga, médico, férias…" />
          </div>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="button" className="w-fit" disabled={isSaving} onClick={() => void handleAdd()}>
          <Plus />
          {isSaving ? "Adicionando…" : "Adicionar ausência"}
        </Button>
      </div>
    </section>
  );
}
