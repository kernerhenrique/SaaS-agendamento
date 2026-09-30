"use client";

import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, MessageCircle, RotateCcw, ShieldOff } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { buildWhatsAppShareUrl } from "@/lib/whatsapp";

export type StaffAccessStatus = "none" | "invited" | "active" | "revoked";

export interface StaffAccessDto {
  status: StaffAccessStatus;
  user: { name: string; email: string } | null;
  inviteExpiresAt: string | null;
}

const STATUS_BADGE: Record<StaffAccessStatus, { label: string; tone: "confirmed" | "scheduled" | "cancelled" }> = {
  none: { label: "Sem acesso", tone: "cancelled" },
  revoked: { label: "Acesso revogado", tone: "cancelled" },
  invited: { label: "Convite enviado", tone: "scheduled" },
  active: { label: "Acesso ativo", tone: "confirmed" },
};

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/**
 * "Acesso ao painel" no cadastro do profissional (só o dono vê). Gera o link
 * de convite (copiar ou mandar pelo WhatsApp), mostra a situação e revoga.
 * O link só aparece logo depois de gerado: no banco fica só o hash.
 */
export function StaffAccessCard({
  professionalId,
  professionalName,
  demo,
}: {
  professionalId: string;
  professionalName: string;
  /** Style guide: mostra este estado e não chama a API. */
  demo?: StaffAccessDto;
}) {
  const [access, setAccess] = useState<StaffAccessDto | null>(demo ?? null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isConfirmingRevoke, setIsConfirmingRevoke] = useState(false);

  useEffect(() => {
    if (demo) return;
    let cancelled = false;
    fetch(`/api/admin/staff/${professionalId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { access: StaffAccessDto }) => {
        if (!cancelled) setAccess(data.access);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [professionalId, reloadKey, demo]);

  async function generateInvite() {
    if (demo) {
      setInviteUrl("https://exemplo.com/admin/convite/link-de-demonstracao");
      return;
    }
    setIsBusy(true);
    try {
      const response = await fetch(`/api/admin/staff/${professionalId}/invite`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.error ?? "Não foi possível gerar o convite");
        return;
      }
      setInviteUrl(data.invite.url);
      setAccess((current) => (current ? { ...current, status: "invited", inviteExpiresAt: data.invite.expiresAt } : current));
      toast.success("Convite gerado. Envie o link para o profissional.");
    } finally {
      setIsBusy(false);
    }
  }

  async function revoke() {
    if (demo) {
      toast.info("Demonstração: nada foi alterado.");
      setIsConfirmingRevoke(false);
      return;
    }
    setIsBusy(true);
    try {
      const response = await fetch(`/api/admin/staff/${professionalId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.error ?? "Não foi possível revogar");
        return;
      }
      setAccess(data.access);
      setInviteUrl(null);
      toast.success("Acesso revogado.");
    } finally {
      setIsBusy(false);
      setIsConfirmingRevoke(false);
    }
  }

  async function copyLink() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar. Selecione o link e copie manualmente.");
    }
  }

  return (
    <section aria-labelledby="staff-access-title" className="flex max-w-2xl flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="staff-access-title" className="flex items-center gap-2 text-sm font-semibold">
          <KeyRound className="size-4 text-muted-foreground" />
          Acesso ao painel
        </h2>
        {access ? <StatusBadge tone={STATUS_BADGE[access.status].tone}>{STATUS_BADGE[access.status].label}</StatusBadge> : null}
      </div>

      {loadError ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-destructive">Não foi possível carregar a situação do acesso.</p>
          <Button variant="outline" size="sm" onClick={() => { setLoadError(false); setReloadKey((key) => key + 1); }}>
            <RotateCcw />
            Tentar de novo
          </Button>
        </div>
      ) : !access ? (
        <div className="flex flex-col gap-2" aria-busy aria-label="Carregando acesso">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-8 w-32" />
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {access.status === "active" && access.user
              ? `${access.user.name} entra com ${access.user.email}. Vê só a própria agenda e os próprios clientes.`
              : access.status === "invited" && access.inviteExpiresAt
                ? `Link enviado, aguardando o aceite. Vale até ${formatDate(access.inviteExpiresAt)}.`
                : `Com acesso, ${professionalName} vê a própria agenda e os próprios clientes, conclui atendimentos e registra pagamentos (sem desconto). Financeiro, relatórios e configurações continuam só com você.`}
          </p>

          {inviteUrl ? (
            <div className="flex flex-col gap-2 rounded-md bg-muted p-3">
              <p className="text-caption text-muted-foreground">Link de convite (só aparece agora; vale 7 dias e uma única vez):</p>
              <Input readOnly value={inviteUrl} aria-label="Link de convite" className="bg-background font-mono text-caption" />
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => void copyLink()}>
                  {copied ? <Check /> : <Copy />}
                  {copied ? "Copiado" : "Copiar link"}
                </Button>
                <a
                  href={buildWhatsAppShareUrl(`Olá, ${professionalName}! Este é o seu acesso ao painel da agenda: ${inviteUrl}`)}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonVariants({ size: "sm" })}
                >
                  <MessageCircle />
                  Enviar pelo WhatsApp
                </a>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {access.status !== "active" ? (
              <Button type="button" size="sm" variant={inviteUrl ? "outline" : "default"} disabled={isBusy} onClick={() => void generateInvite()}>
                <KeyRound />
                {access.status === "invited" ? "Gerar novo link" : "Gerar convite"}
              </Button>
            ) : null}
            {access.status === "active" || access.status === "invited" ? (
              <Button type="button" size="sm" variant="outline" disabled={isBusy} onClick={() => setIsConfirmingRevoke(true)}>
                <ShieldOff />
                {access.status === "active" ? "Revogar acesso" : "Cancelar convite"}
              </Button>
            ) : null}
          </div>
        </>
      )}

      <Dialog open={isConfirmingRevoke} onOpenChange={setIsConfirmingRevoke}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{access?.status === "active" ? "Revogar o acesso?" : "Cancelar o convite?"}</DialogTitle>
            <DialogDescription>
              {access?.status === "active"
                ? `${professionalName} deixa de entrar no painel (em até 15 minutos, se estiver usando agora). Os atendimentos e o histórico continuam. Dá para convidar de novo depois.`
                : "O link enviado deixa de funcionar."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmingRevoke(false)}>
              Voltar
            </Button>
            <Button variant="destructive" disabled={isBusy} onClick={() => void revoke()}>
              {access?.status === "active" ? "Revogar acesso" : "Cancelar convite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
