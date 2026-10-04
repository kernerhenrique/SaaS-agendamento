"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { CalendarPlus, MessageCircle, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { useAdminAccess } from "@/components/admin/admin-access-context";
import { AppointmentHistoryLists } from "@/components/admin/appointment-history-lists";
import { useNow } from "@/components/admin/booking-time-notice";
import { DetailDrawerContent } from "@/components/detail-drawer";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  /** Marcados daqui para frente (excluir o cadastro cancela todos). */
  upcomingCount: number;
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

/**
 * Ficha do cliente (drawer): dados, notas internas, tags e histórico. Tudo é
 * salvo só no botão; fechar com alteração pendente pergunta antes de descartar.
 */
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
  const [isDirty, setIsDirty] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);
  /** "Salvar e fechar" do aviso chama o salvar da ficha aberta. */
  const saveRef = useRef<(() => Promise<boolean>) | null>(null);

  function requestClose() {
    if (isDirty) setConfirmingClose(true);
    else onClose();
  }

  function close() {
    setConfirmingClose(false);
    setIsDirty(false);
    onClose();
  }

  return (
    <>
      <Sheet open={clientId != null} onOpenChange={(open) => !open && requestClose()}>
        {clientId ? (
          <ClientDrawerBody
            key={clientId}
            clientId={clientId}
            timezone={timezone}
            onChanged={onChanged}
            onDeleted={() => {
              onChanged();
              close();
            }}
            onDirtyChange={setIsDirty}
            saveRef={saveRef}
            onNewAppointment={onNewAppointment}
          />
        ) : null}
      </Sheet>

      <Dialog open={confirmingClose} onOpenChange={setConfirmingClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sair sem salvar?</DialogTitle>
            <DialogDescription>Você mudou dados, notas ou tags desta ficha e ainda não salvou.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmingClose(false)}>
              Continuar editando
            </Button>
            <Button variant="outline" onClick={close}>
              Descartar
            </Button>
            <Button
              onClick={async () => {
                if (await saveRef.current?.()) close();
                else setConfirmingClose(false);
              }}
            >
              Salvar e fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ClientDrawerBody({
  clientId,
  timezone,
  onChanged,
  onDeleted,
  onDirtyChange,
  saveRef,
  onNewAppointment,
}: {
  clientId: string;
  timezone: string;
  onChanged: () => void;
  onDeleted: () => void;
  onDirtyChange: (dirty: boolean) => void;
  saveRef: React.RefObject<(() => Promise<boolean>) | null>;
  onNewAppointment: (client: { name: string; phone: string; email: string | null }) => void;
}) {
  const canManageContact = useAdminAccess().can("appointment.manageAny");
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  /** Corrigir nome/WhatsApp/e-mail (só o dono). */
  const [contactDraft, setContactDraft] = useState<{ name: string; phone: string; email: string } | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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

  const notesDirty = detail
    ? notes.trim() !== (detail.client.internalNotes ?? "") || tags.join("\n") !== detail.client.tags.join("\n") || tagDraft.trim() !== ""
    : false;
  const contactDirty =
    detail && contactDraft
      ? contactDraft.name.trim() !== detail.client.name ||
        contactDraft.phone.replace(/\D/g, "") !== detail.client.phone ||
        contactDraft.email.trim() !== (detail.client.email ?? "")
      : false;
  const isDirty = notesDirty || contactDirty;

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const formatDate = (iso: string, options: Intl.DateTimeFormatOptions = { dateStyle: "short" }) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, ...options }).format(new Date(iso));

  async function saveNotes(): Promise<boolean> {
    setIsSaving(true);
    try {
      const pendingTags = tagDraft.trim() ? normalizeTags([...tags, ...tagDraft.split(",")]) : tags;
      const response = await fetch(`/api/admin/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalNotes: notes.trim() || null, tags: pendingTags }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(data?.error ?? "Não foi possível salvar");
        return false;
      }
      setTagDraft("");
      setDetail((prev) => (prev ? { ...prev, client: { ...prev.client, ...data.client, notesUpdatedBy: "você" } } : prev));
      setTags(data.client.tags);
      setNotes(data.client.internalNotes ?? "");
      toast.success("Ficha atualizada.");
      onChanged();
      return true;
    } catch {
      toast.error("Sem conexão. Tente de novo.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function saveContact(event?: FormEvent<HTMLFormElement>): Promise<boolean> {
    event?.preventDefault();
    if (!contactDraft) return true;
    setContactError(null);
    setIsSavingContact(true);
    try {
      const response = await fetch(`/api/admin/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact: contactDraft }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setContactError(data?.error ?? "Não foi possível salvar");
        return false;
      }
      setDetail((prev) => (prev ? { ...prev, client: { ...prev.client, ...data.client } } : prev));
      setContactDraft(null);
      toast.success("Dados do cadastro atualizados.");
      onChanged();
      return true;
    } catch {
      setContactError("Sem conexão. Tente de novo.");
      return false;
    } finally {
      setIsSavingContact(false);
    }
  }

  // "Salvar e fechar" (aviso de alterações não salvas): salva o que estiver pendente.
  useEffect(() => {
    saveRef.current = async () => {
      if (contactDirty && !(await saveContact())) return false;
      if (notesDirty && !(await saveNotes())) return false;
      return true;
    };
  });

  async function confirmDelete() {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/clients/${clientId}`, { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(data?.error ?? "Não foi possível excluir");
        return;
      }
      toast.success(
        data.cancelledAppointments > 0
          ? `Cliente excluído. ${data.cancelledAppointments === 1 ? "1 agendamento futuro foi cancelado" : `${data.cancelledAppointments} agendamentos futuros foram cancelados`}.`
          : "Cliente excluído.",
      );
      setConfirmingDelete(false);
      onDeleted();
    } finally {
      setIsDeleting(false);
    }
  }

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

  return (
    <DetailDrawerContent
      title={client.name}
      description={`Cadastro desde ${formatDate(client.createdAt, { month: "long", year: "numeric" })}`}
      footer={
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={!notesDirty || isSaving} onClick={() => void saveNotes()}>
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
        {contactDraft ? (
          <form onSubmit={(event) => void saveContact(event)} className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-3" aria-label="Corrigir dados do cadastro">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact-name">Nome</Label>
              <Input id="contact-name" value={contactDraft.name} onChange={(e) => setContactDraft({ ...contactDraft, name: e.target.value })} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact-phone">WhatsApp</Label>
              <Input
                id="contact-phone"
                type="tel"
                inputMode="numeric"
                value={contactDraft.phone}
                onChange={(e) => setContactDraft({ ...contactDraft, phone: formatPhoneBR(e.target.value) })}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact-email">E-mail (opcional)</Label>
              <Input id="contact-email" type="email" value={contactDraft.email} onChange={(e) => setContactDraft({ ...contactDraft, email: e.target.value })} />
            </div>
            {contactError ? <p className="text-sm text-destructive">{contactError}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm" disabled={isSavingContact || !contactDirty}>
                {isSavingContact ? "Salvando…" : "Salvar dados"}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => { setContactDraft(null); setContactError(null); }}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <section className="flex flex-col gap-1">
            <p className="tabular-nums">{formatPhoneBR(client.phone)}</p>
            {client.email ? <p className="text-muted-foreground">{client.email}</p> : null}
            <div className="mt-1 flex flex-wrap gap-2">
              <a
                href={buildWhatsAppUrl(client.phone)}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit" })}
              >
                <MessageCircle />
                WhatsApp
              </a>
              {canManageContact ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setContactDraft({ name: client.name, phone: formatPhoneBR(client.phone), email: client.email ?? "" })}
                >
                  <Pencil />
                  Corrigir dados
                </Button>
              ) : null}
            </div>
          </section>
        )}

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
                      className="flex size-6 items-center justify-center rounded-sm hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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
          {notesDirty ? <p className="text-caption text-warning">Alterações ainda não salvas: use “Salvar notas e tags”.</p> : null}
        </section>

        <AppointmentHistoryLists items={history} now={now} formatDateTime={formatDate} />

        {canManageContact ? (
          <section className="flex flex-col gap-2 rounded-lg border border-destructive/30 p-3">
            <h3 className="font-medium">Excluir cliente</h3>
            <p className="text-muted-foreground">
              A pedido do cliente (LGPD): apaga nome, WhatsApp, e-mail, notas e tags. Os atendimentos antigos continuam nos
              relatórios e no financeiro, sem o nome.
            </p>
            <Button variant="outline" size="sm" className="w-fit" onClick={() => setConfirmingDelete(true)}>
              <Trash2 />
              Excluir cliente
            </Button>
          </section>
        ) : null}
      </div>

      <Dialog open={confirmingDelete} onOpenChange={(open) => !isDeleting && setConfirmingDelete(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir {client.name}?</DialogTitle>
            <DialogDescription>
              Nome, WhatsApp, e-mail, notas e tags são apagados e o cadastro some da lista.
              {detail.upcomingCount > 0
                ? ` ${detail.upcomingCount === 1 ? "O agendamento futuro dele será cancelado" : `Os ${detail.upcomingCount} agendamentos futuros dele serão cancelados`}.`
                : ""}{" "}
              Os atendimentos antigos ficam nos relatórios, sem o nome. Não dá para desfazer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={isDeleting} onClick={() => setConfirmingDelete(false)}>
              Voltar
            </Button>
            <Button variant="destructive" disabled={isDeleting} onClick={() => void confirmDelete()}>
              {isDeleting ? "Excluindo…" : "Excluir cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
