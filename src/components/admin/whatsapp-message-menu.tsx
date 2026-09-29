"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MessageKind } from "@/generated/prisma/enums";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { MESSAGE_KIND_LABELS } from "@/server/modules/notification/whatsapp/templates";

export interface PreparedMessageDto {
  kind: MessageKind;
  text: string;
  url: string;
  sentAt: string | null;
}

/** Marca a mensagem como enviada; devolve o horário gravado (ou null se falhou). */
export async function markMessageSent(appointmentId: string, kind: MessageKind): Promise<string | null> {
  try {
    const response = await fetch(`/api/admin/appointments/${appointmentId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    if (!response.ok) throw new Error();
    return ((await response.json()) as { sentAt: string }).sentAt;
  } catch {
    toast.error("A mensagem abriu, mas não foi possível marcar como enviada.");
    return null;
  }
}

/**
 * "WhatsApp ▾" com os textos prontos do agendamento. Cada opção é um link
 * wa.me de verdade (abrir depois de um fetch seria bloqueado como pop-up); o
 * clique só avisa o servidor para marcar como enviada.
 */
export function WhatsAppMessageMenu({
  appointmentId,
  phone,
  timezone,
}: {
  appointmentId: string;
  phone: string;
  timezone: string;
}) {
  const [messages, setMessages] = useState<PreparedMessageDto[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/appointments/${appointmentId}/messages`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { messages: PreparedMessageDto[] }) => {
        if (!cancelled) setMessages(data.messages);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  const plainLink = buildWhatsAppUrl(phone);
  const sentTime = (iso: string) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(
      new Date(iso),
    );

  // Sem os textos (erro ao carregar): o botão antigo, conversa sem mensagem pronta.
  if (failed) {
    return (
      <a href={plainLink} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit" })}>
        <MessageCircle />
        WhatsApp
      </a>
    );
  }

  async function handleSent(kind: MessageKind) {
    const sentAt = await markMessageSent(appointmentId, kind);
    if (sentAt) setMessages((current) => current?.map((message) => (message.kind === kind ? { ...message, sentAt } : message)) ?? null);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="w-fit" disabled={!messages} />}>
        <MessageCircle />
        WhatsApp
        <ChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Enviar mensagem pronta</DropdownMenuLabel>
          {messages?.map((message) => (
            <DropdownMenuItem
              key={message.kind}
              render={<a href={message.url} target="_blank" rel="noreferrer" />}
              onClick={() => void handleSent(message.kind)}
              className="flex items-start gap-2"
            >
              {message.sentAt ? <Check className="mt-0.5 text-success" /> : <MessageCircle className="mt-0.5" />}
              <span className="flex flex-col">
                <span>{MESSAGE_KIND_LABELS[message.kind]}</span>
                <span className="text-caption text-muted-foreground">
                  {message.sentAt ? `Enviada ${sentTime(message.sentAt)}` : "Ainda não enviada"}
                </span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<a href={plainLink} target="_blank" rel="noreferrer" />}>
          <MessageCircle />
          Conversa sem mensagem pronta
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
