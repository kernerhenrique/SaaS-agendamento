import { LEGAL } from "@/config/brand";

/**
 * Página de vendas (aprazzo.com.br): contato de vendas e medição.
 * O WhatsApp é o canal oficial da Aprazzo (`LEGAL.contactWhatsapp`), com DDI 55.
 */
export const LANDING = {
  whatsappNumber: `55${LEGAL.contactWhatsapp}`,
  whatsappMessage: "Olá! Vi o site e quero conhecer a Aprazzo.",
  loginPath: "/admin/login",
} as const;

export function salesWhatsAppUrl(): string {
  return `https://wa.me/${LANDING.whatsappNumber}?text=${encodeURIComponent(LANDING.whatsappMessage)}`;
}

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/**
 * Evento de medição: só vai para o `dataLayer` se um gerenciador de tags for instalado
 * (com aviso de cookies, LGPD). Sem ele, não faz nada. `whatsapp_click` conta clique,
 * não conversa: a conversa se mede no WhatsApp Business.
 */
export function track(event: string, params: Record<string, string> = {}): void {
  if (typeof window !== "undefined" && Array.isArray(window.dataLayer)) window.dataLayer.push({ event, ...params });
}

/**
 * Botões da página de vendas: pílula alta (52 px), área de toque generosa. Fica aqui (módulo
 * neutro) e não em arquivo "use client": no servidor, o que vem de lá chega vazio.
 */
export const landingButton = {
  base: "inline-flex min-h-13 items-center justify-center gap-2.5 rounded-full px-6 text-base font-semibold transition-[background-color,transform,box-shadow] duration-150 ease-brand active:scale-[0.98] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
  primary: "bg-brand-cover text-on-brand shadow-cta hover:bg-brand-deep",
  ghost: "text-foreground ring-[1.5px] ring-input ring-inset hover:bg-card",
  light: "bg-on-brand text-brand-deep hover:bg-brand-mint",
  small: "min-h-11 px-4.5 text-sm",
} as const;
