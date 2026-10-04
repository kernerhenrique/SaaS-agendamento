"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { CalendarPlus, MessageCircle, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";

import { AppointmentHistoryLists } from "@/components/admin/appointment-history-lists";
import { useNow } from "@/components/admin/booking-time-notice";
import { DetailDrawerContent } from "@/components/detail-drawer";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { AppointmentStatus } from "@/generated/prisma/enums";
import { formatPriceFromCents } from "@/lib/currency";
import { formatPhoneBR } from "@/lib/phone";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { MAX_TAGS, normalizeTags } from "@/server/modules/client/client-rules";
import { cn } from "cn";

interface ClientDetail {
  client: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    internalNotes: string | null;
    tags: string[];
    createdAt: string;
    /** Notas e tags são compartilhadas entre quem atende: quem editou por último e quando. */
    notesUpdatedBy: string | null;
    notesUpdatedAt: string | null;
  };
  summary: { completed: number; noShows: number; lastVisitAt: string | null; nextAppointmentAt: string | null };
  /** null para o profissional (o financeiro do cliente fica com o dono). */
  totalSpentCents: number | null;
  history: {
    id: string;
    status: AppointmentStatus;
    startAt: string;
    service: { name: string };
    professional: { name: string };
  }[];
}

/** Ficha do cliente (drawer): dados, notas internas, tags e histórico. */
export function ClientDrawer({
  clientId,
  timezone,
  onClose,
  onChanged,
  onNewAppointment,
}: {
  clientId: string | null;
  timezone: string;
  onClose: () => void;
  onChanged: () => void;
  onNewAppointment: (client: { name: string; phone: string; email: string | null }) => void;
}) {
  return (
    <Sheet open={clientId != null} onOpenChange={(open) => !open && onClose()}>
      {clientId ? (
        <ClientDrawerBody
          key={clientId}
          clientId={clientId}
          timezone={timezone}
          onChanged={onChanged}
          onNewAppointment={onNewAppointment}
        />
      ) : null}
    </Sheet>
  );
}

function ClientDrawerBody({
  clientId,
  timezone,
  onChanged,
  onNewAppointment,
}: {
  clientId: string;
  timezone: string;
  onChanged: () => void;
  onNewAppointment: (client: { name: string; phone: string; email: string | null }) => void;
}) {
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const now = useNow();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/clients/${clientId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: ClientDetail) => {
        if (cancelled) return;
        setDetail(data);
        setNotes(data.client.internalNotes ?? "");
        setTags(data.client.tags);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, reloadKey]);

  const formatDate = (iso: string, options: Intl.DateTimeFormatOptions = { dateStyle: "short" }) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, ...options }).format(new Date(iso));

  if (loadError) {
    return (
      <DetailDrawerContent title="Cadastro">
        <p className="py-4 text-sm text-destructive">Não foi possível carregar este cadastro.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLoadError(false);
            setReloadKey((k) => k + 1);
          }}
        >
          <RotateCcw />
          Tentar de novo
        </Button>
      </DetailDrawerContent>
    );
  }

  if (!detail) {
    return (
      <DetailDrawerContent title="Carregando…">
        <div className="flex flex-col gap-3 py-2" aria-busy>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </DetailDrawerContent>
    );
  }

  const { client, summary, history } = detail;
  const isDirty = notes.trim() !== (client.internalNotes ?? "") || tags.join("\n") !== client.tags.join("\n");

  function addTag() {
    const next = normalizeTags([...tags, ...tagDraft.split(",")]);
    setTags(next);
    setTagDraft("");
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag();
    } else if (event.key === "Backspace" && !tagDraft && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  }

  async function save() {
    setIsSaving(true);
    try {
      const pendingTags = tagDraft.trim() ? normalizeTags([...tags, ...tagDraft.split(",")]) : tags;
      const response = await fetch(`/api/admin/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalNotes: notes.trim() || null, tags: pendingTags }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.error ?? "Não foi possível salvar");
        return;
      }
      setTagDraft("");
      setDetail((prev) => (prev ? { ...prev, client: { ...prev.client, ...data.client, notesUpdatedBy: "você" } } : prev));
      setTags(data.client.tags);
      setNotes(data.client.internalNotes ?? "");
      toast.success("Ficha atualizada.");
      onChanged();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <DetailDrawerContent
      title={client.name}
      description={`Cadastro desde ${formatDate(client.createdAt, { month: "long", year: "numeric" })}`}
      footer={
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={!isDirty && !tagDraft.trim()} onClick={() => void save()}>
            {isSaving ? "Salvando…" : "Salvar notas e tags"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNewAppointment({ name: client.name, phone: client.phone, email: client.email })}
          >
            <CalendarPlus />
            Novo agendamento
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5 py-2 text-sm">
        <section className="flex flex-col gap-1">
          <p className="tabular-nums">{formatPhoneBR(client.phone)}</p>
          {client.email ? <p className="text-muted-foreground">{client.email}</p> : null}
          <a
            href={buildWhatsAppUrl(client.phone)}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm", className: "mt-1 w-fit" })}
          >
            <MessageCircle />
            WhatsApp
          </a>
        </section>

        <dl className={cn("grid gap-2 text-center", detail.totalSpentCents !== null ? "grid-cols-2" : "grid-cols-3")}>
          {detail.totalSpentCents !== null ? (
            <Stat label="Total gasto" value={formatPriceFromCents(detail.totalSpentCents)} />
          ) : null}
          <Stat label="Atendimentos" value={String(summary.completed)} />
          <Stat label="Faltas" value={String(summary.noShows)} tone={summary.noShows > 0 ? "danger" : undefined} />
          <Stat
            label="Última visita"
            value={summary.lastVisitAt ? formatDate(summary.lastVisitAt, { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—"}
          />
        </dl>

        <section className="flex flex-col gap-2">
          <Label htmlFor="client-notes">Notas internas</Label>
          <Textarea
            id="client-notes"
            rows={3}
            placeholder="Preferências, alergias, observações… (só a equipe vê)"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
          {client.notesUpdatedBy && client.notesUpdatedAt ? (
            <p className="text-caption text-muted-foreground">
              Notas e tags editadas por {client.notesUpdatedBy} em{" "}
              {formatDate(client.notesUpdatedAt, { day: "2-digit", month: "2-digit", year: "numeric" })}
            </p>
          ) : null}
        </section>

        <section className="flex flex-col gap-2">
          <Label htmlFor="client-tag-input">Tags</Label>
          {tags.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5" aria-label="Tags do cadastro">
              {tags.map((tag) => (
                <li key={tag}>
                  <Badge variant="secondary" className="gap-1 pr-1">
                    {tag}
                    <button
                      type="button"
                      aria-label={`Remover tag ${tag}`}
                      className="rounded-sm hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      onClick={() => setTags(tags.filter((t) => t !== tag))}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                </li>
              ))}
            </ul>
          ) : null}
          <Input
            id="client-tag-input"
            placeholder={tags.length >= MAX_TAGS ? `Máximo de ${MAX_TAGS} tags` : "Ex.: VIP, prefere manhã (Enter para adicionar)"}
            value={tagDraft}
            disabled={tags.length >= MAX_TAGS}
            onChange={(event) => setTagDraft(event.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={() => tagDraft.trim() && addTag()}
          />
        </section>

        <AppointmentHistoryLists items={history} now={now} formatDateTime={formatDate} />
      </div>
    </DetailDrawerContent>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-2">
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd
        className={
          tone === "danger" ? "text-sm font-semibold text-destructive tabular-nums" : "text-sm font-semibold tabular-nums"
        }
      >
        {value}
      </dd>
    </div>
  );
}
