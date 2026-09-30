/** Gera a URL do wa.me a partir de um telefone brasileiro (com ou sem máscara/DDI) e uma mensagem opcional. */
export function buildWhatsAppUrl(phone: string, message?: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCountryCode = digits.startsWith("55") ? digits : `55${digits}`;

  const url = `https://wa.me/${withCountryCode}`;
  return message ? `${url}?text=${encodeURIComponent(message)}` : url;
}

/** Compartilhar um texto pelo WhatsApp escolhendo o contato na hora (sem telefone definido). */
export function buildWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
