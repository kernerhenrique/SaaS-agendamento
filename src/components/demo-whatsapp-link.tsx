"use client";

import type { ReactNode } from "react";

import { LANDING, salesWhatsAppUrl, track } from "@/components/landing/landing-config";

/**
 * WhatsApp de vendas da Aprazzo nas demonstrações: quem testou chama sem sair da demo.
 * A conversa já chega dizendo que veio da demonstração, e o clique entra na medição
 * própria (`demo-pagina` ou `demo-painel`). No painel não há Google Analytics, então
 * lá o `track` só soma a contagem própria.
 */
export function DemoWhatsAppLink({
  section,
  className,
  children,
}: {
  section: "demo-pagina" | "demo-painel";
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={salesWhatsAppUrl(LANDING.whatsappMessageDemo)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("whatsapp_click", { section })}
      className={className}
    >
      {children}
      <span className="sr-only">(abre o WhatsApp em nova aba)</span>
    </a>
  );
}
