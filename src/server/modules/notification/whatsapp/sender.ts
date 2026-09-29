import { buildWhatsAppUrl } from "@/lib/whatsapp";

/**
 * Ponto único de envio de WhatsApp. Hoje o envio é feito pelo próprio dono:
 * geramos um link wa.me com o texto pronto e ele toca em "Enviar" no WhatsApp
 * dele. Para plugar a API oficial (ou um provedor) no futuro, basta outra
 * implementação desta interface — as telas não mudam.
 */
export interface PreparedWhatsAppMessage {
  /** "link": o dono abre e envia; uma API futura devolveria "sent". */
  delivery: "link";
  url: string;
}

export interface WhatsAppSender {
  prepare(phone: string, text: string): PreparedWhatsAppMessage;
}

export const waMeLinkSender: WhatsAppSender = {
  prepare: (phone, text) => ({ delivery: "link", url: buildWhatsAppUrl(phone, text) }),
};

export const whatsappSender: WhatsAppSender = waMeLinkSender;
