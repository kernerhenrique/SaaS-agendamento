"use client";

import type { ComponentProps, ReactNode } from "react";
import { MessageCircle } from "lucide-react";

import { cn } from "@/lib/utils";

import { LANDING, landingButton, salesWhatsAppUrl, track } from "./landing-config";



/** Link do WhatsApp de vendas: abre em nova aba e registra o clique com a seção de origem. */
export function WhatsAppCta({
  section,
  variant = "primary",
  size,
  className,
  children = "Conhecer a Aprazzo pelo WhatsApp",
  icon = true,
  tabIndex,
  message,
}: {
  section: string;
  variant?: "primary" | "light";
  size?: "small";
  className?: string;
  children?: ReactNode;
  icon?: boolean;
  tabIndex?: number;
  /** Texto que já vem escrito na conversa (padrão: "quero conhecer a Aprazzo"). */
  message?: string;
}) {
  return (
    <a
      href={salesWhatsAppUrl(message)}
      target="_blank"
      rel="noopener noreferrer"
      tabIndex={tabIndex}
      onClick={() => track("whatsapp_click", { section })}
      className={cn(landingButton.base, landingButton[variant], size && landingButton.small, className)}
    >
      {icon ? <MessageCircle className="size-5 shrink-0" aria-hidden /> : null}
      {children}
    </a>
  );
}

/** "Entrar" (painel dos clientes): não conta como lead. */
export function LoginLink({ className, children = "Entrar", ...props }: Omit<ComponentProps<"a">, "href">) {
  return (
    <a href={LANDING.loginPath} onClick={() => track("login_click")} className={className} {...props}>
      {children}
    </a>
  );
}

/** O mesmo WhatsApp de vendas, como link de texto (ex.: o número no rodapé). */
export function WhatsAppTextLink({ section, className, children }: { section: string; className?: string; children: ReactNode }) {
  return (
    <a href={salesWhatsAppUrl()} target="_blank" rel="noopener noreferrer" onClick={() => track("whatsapp_click", { section })} className={className}>
      {children}
    </a>
  );
}
