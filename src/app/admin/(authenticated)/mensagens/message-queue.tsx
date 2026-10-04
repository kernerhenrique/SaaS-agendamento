"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, MessageCircle, RotateCcw, Undo2, type LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { markMessageSent } from "@/components/admin/whatsapp-message-menu";
import { EmptyState } from "@/components/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { addDaysToIsoDate, formatDateLabel } from "@/lib/date";
import { useFetchJson } from "@/lib/use-fetch-json";
import { cn } from "cn";
import type { MessageQueue, QueueItem } from "@/server/modules/notification/whatsapp/message.service";

/** Mesmo limite do servidor (message.service.ts): a fila de lembretes vai até 14 dias à frente. */
const REMINDER_LOOKAHEAD_DAYS = 14;

/**
 * Fila de envio um a um: "Enviar" é um link wa.me (abre o WhatsApp com o texto
 * pronto) e marca como enviado; "Desmarcar" desfaz se o dono desistiu.
 */
export function MessageQueueList({
  queue,
  timezone,
  sendLabel,
  emptyIcon,
  emptyTitle,
  emptyDescription,
}: {
  queue: MessageQueue;
  timezone: string;
  sendLabel: string;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const [reloadKey, setReloadKey] = useState(0);
  /** Lembretes: dia escolhido nas setas (null = o servidor abre no próximo dia com atendimento). */
  const [date, setDate] = useState<string | null>(null);
  const { data, loading, error } = useFetchJson<{ date: string; today: string; items: QueueItem[] }>(
    `/api/admin/messages/queue?tipo=${queue}${queue === "lembretes" && date ? `&data=${date}` : ""}`,
    reloadKey,
  );
  /** Envio/desmarcação feitos nesta tela, por cima do que veio do servidor. */
  const [overrides, setOverrides] = useState<Record<string, string | null>>({});

  if (loading) {
    return (
      <div className="flex flex-col gap-3" aria-busy aria-label="Carregando lista">
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex flex-col items-start gap-2 rounded-xl border p-4">
        <p className="text-sm text-destructive">Não foi possível carregar a lista.</p>
        <Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>
          <RotateCcw />
          Tentar de novo
        </Button>
      </div>
    );
  }

  const sentAtOf = (item: QueueItem) =>
    item.appointmentId in overrides ? overrides[item.appointmentId] : item.message.sentAt;
  const sentCount = data.items.filter((item) => sentAtOf(item)).length;
  const dateLabel = formatDateLabel(data.date, timezone);

  async function handleSend(item: QueueItem) {
    const sentAt = await markMessageSent(item.appointmentId, item.message.kind);
    if (sentAt) setOverrides((current) => ({ ...current, [item.appointmentId]: sentAt }));
  }

  async function handleUnmark(item: QueueItem) {
    const response = await fetch(`/api/admin/appointments/${item.appointmentId}/messages?kind=${item.message.kind}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Não foi possível desmarcar.");
      return;
    }
    setOverrides((current) => ({ ...current, [item.appointmentId]: null }));
  }

  const isReminder = queue === "lembretes";
  const lastDay = addDaysToIsoDate(data.today, REMINDER_LOOKAHEAD_DAYS);
  const relative = data.date === data.today ? "Hoje" : data.date === addDaysToIsoDate(data.today, 1) ? "Amanhã" : null;
  // Lembretes: setas para escolher o dia (no sábado dá para lembrar os de segunda).
  const dayPicker = isReminder ? (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" aria-label="Dia anterior" disabled={data.date <= data.today} onClick={() => setDate(addDaysToIsoDate(data.date, -1))}>
        <ChevronLeft />
      </Button>
      <p className="min-w-52 text-center text-sm font-medium first-letter:uppercase" aria-live="polite">
        {relative ? `${relative}, ${dateLabel}` : dateLabel}
      </p>
      <Button variant="outline" size="icon" aria-label="Próximo dia" disabled={data.date >= lastDay} onClick={() => setDate(addDaysToIsoDate(data.date, 1))}>
        <ChevronRight />
      </Button>
    </div>
  ) : null;

  if (data.items.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {dayPicker}
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {dayPicker ?? <p className="text-sm text-muted-foreground">Concluídos de ontem e de hoje</p>}
        <p className="text-sm font-medium" aria-live="polite">
          {sentCount} de {data.items.length} {data.items.length === 1 ? "enviado" : "enviados"}
        </p>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div
          className="h-full rounded-full bg-success transition-[width] motion-reduce:transition-none"
          style={{ width: `${(sentCount / data.items.length) * 100}%` }}
        />
      </div>

      <ul className="flex flex-col gap-2">
        {data.items.map((item) => (
          <MessageQueueRow
            key={item.appointmentId}
            item={item}
            sentAt={sentAtOf(item)}
            timezone={timezone}
            sendLabel={sendLabel}
            onSend={() => void handleSend(item)}
            onUnmark={() => void handleUnmark(item)}
          />
        ))}
      </ul>
    </div>
  );
}

/** Uma linha da fila (só visual; também no style guide). */
export function MessageQueueRow({
  item,
  sentAt,
  timezone,
  sendLabel,
  onSend,
  onUnmark,
}: {
  item: QueueItem;
  sentAt: string | null;
  timezone: string;
  sendLabel: string;
  onSend: () => void;
  onUnmark: () => void;
}) {
  const time = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  return (
    <li className={cn("flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center", sentAt && "bg-muted/40")}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="w-12 shrink-0 pt-0.5 text-sm font-semibold tabular-nums">{time(item.startAt)}</span>
        <div className="min-w-0">
          <p className="truncate font-medium">{item.clientName}</p>
          <p className="truncate text-sm text-muted-foreground">
            {item.serviceName} · {item.professionalName}
          </p>
          <details className="mt-1 text-sm">
            <summary className="cursor-pointer text-caption text-muted-foreground hover:text-foreground">Ver mensagem</summary>
            <p className="mt-1 rounded-md bg-muted p-2 whitespace-pre-line">{item.message.text}</p>
          </details>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
        {sentAt ? (
          <>
            <span className="inline-flex items-center gap-1 text-sm text-success">
              <Check className="size-4" />
              Enviado {time(sentAt)}
            </span>
            <Button variant="ghost" size="sm" onClick={onUnmark}>
              <Undo2 />
              Desmarcar
            </Button>
          </>
        ) : null}
        <a
          href={item.message.url}
          target="_blank"
          rel="noreferrer"
          onClick={onSend}
          className={buttonVariants({ variant: sentAt ? "outline" : "default", size: "sm" })}
        >
          <MessageCircle />
          {sentAt ? "Reenviar" : sendLabel}
        </a>
      </div>
    </li>
  );
}
