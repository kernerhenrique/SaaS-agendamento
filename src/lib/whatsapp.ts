import { nationalDigitsBR } from "@/lib/phone";

/** Gera a URL do wa.me a partir de um telefone brasileiro (com ou sem máscara/DDI) e uma mensagem opcional. */
export function buildWhatsAppUrl(phone: string, message?: string): string {
  // "Começa com 55" não basta para saber se o DDI já veio: 55 também é DDD (interior do RS).
  const url = `https://wa.me/55${nationalDigitsBR(phone)}`;
  return message ? `${url}?text=${encodeURIComponent(message)}` : url;
}

/** Compartilhar um texto pelo WhatsApp escolhendo o contato na hora (sem telefone definido). */
export function buildWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
