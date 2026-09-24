"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { localMinutesToUtc } from "@/lib/date";
import { timeInputToMinutes } from "@/lib/weekday";

interface TimeBlockDto {
  id: string;
  startAt: string;
  endAt: string;
  reason: string | null;
}

function formatRange(startAt: string, endAt: string, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${formatter.format(new Date(startAt))} – ${formatter.format(new Date(endAt))}`;
}

export function TimeBlocksManager({
  professionalId,
  timezone,
}: {
  professionalId: string;
  timezone: string;
}) {
  const [timeBlocks, setTimeBlocks] = useState<TimeBlockDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("23:59");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function loadTimeBlocks() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/professionals/${professionalId}`);
      const data = await response.json();
      setTimeBlocks(response.ok ? data.professional.timeBlocks : []);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTimeBlocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [professionalId]);

  async function handleAdd() {
    setError(null);
    const startMinute = timeInputToMinutes(startTime);
    const endMinute = timeInputToMinutes(endTime);
    if (!date || startMinute === null || endMinute === null) {
      setError("Preencha data, início e fim");
      return;
    }
    const startAt = localMinutesToUtc(date, startMinute, timezone);
    const endAt = localMinutesToUtc(date, endMinute, timezone);

    const response = await fetch(`/api/admin/professionals/${professionalId}/time-blocks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        reason: reason || undefined,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data?.error ?? "Não foi possível criar o bloqueio");
      return;
    }
    setDate("");
    setReason("");
    await loadTimeBlocks();
  }

  async function handleDelete(blockId: string) {
    await fetch(`/api/admin/professionals/${professionalId}/time-blocks/${blockId}`, {
      method: "DELETE",
    });
    await loadTimeBlocks();
  }

  return (
    <div className="flex flex-col gap-2">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : timeBlocks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum bloqueio cadastrado.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {timeBlocks.map((timeBlock) => (
            <li key={timeBlock.id} className="flex items-center justify-between gap-2 text-sm">
              <span>
                {formatRange(timeBlock.startAt, timeBlock.endAt, timezone)}
                {timeBlock.reason ? ` — ${timeBlock.reason}` : ""}
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(timeBlock.id)}>
                Remover
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2 rounded-md border p-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Data</span>
          <Input type="date" className="w-36" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Início</span>
          <Input
            type="time"
            className="w-24"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Fim</span>
          <Input type="time" className="w-24" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <span className="text-xs text-muted-foreground">Motivo (opcional)</span>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Feriado, folga..." />
        </div>
        <Button type="button" variant="outline" onClick={handleAdd}>
          Adicionar
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
