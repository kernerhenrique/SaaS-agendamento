import { getVertical, type VerticalKey } from "@/config/vertical";
import { BRAND } from "@/config/brand";
import { formatDateLabel, utcToLocalDate } from "@/lib/date";

/**
 * Textos da entrega de um cliente novo: a mensagem para o dono (WhatsApp) e o
 * checklist para quem entrega conferir antes de mandar. Puro, para testar.
 */
export interface DeliveryInfo {
  businessName: string;
  businessType: VerticalKey;
  publicUrl: string;
  ownerInviteUrl: string;
  ownerInviteExpiresAt: string;
  timezone: string;
}

export function buildOwnerMessage(info: DeliveryInfo): string {
  const { professional } = getVertical(info.businessType).terms;
  const expires = formatDateLabel(utcToLocalDate(new Date(info.ownerInviteExpiresAt), info.timezone), info.timezone);
  return [
    `Olá! O sistema da ${info.businessName} está pronto.`,
    "",
    `1) Crie o seu acesso de dono (link pessoal, vale até ${expires}):`,
    info.ownerInviteUrl,
    "",
    "2) Esta é a página de reservas para colocar na bio do Instagram e mandar aos clientes:",
    info.publicUrl,
    "",
    `Depois de entrar, no menu ${professional.plural} você gera o convite de cada ${professional.singular.toLowerCase()} para ele ver a própria agenda.`,
    `Qualquer dúvida, é só me chamar. Equipe ${BRAND.name}`,
  ].join("\n");
}

/** Mensagem para o prospect com a prévia de demonstração (`novo-cliente --demo`). */
export function buildDemoMessage(info: { businessName: string; publicUrl: string; expiresAt: Date | null; timezone: string }): string {
  const lines = [
    `Oi! Montei uma prévia de como ficaria o sistema da ${info.businessName}:`,
    info.publicUrl,
    "",
    'Faça uma reserva de teste, como se fosse um cliente, e depois toque em "Ver o painel da demonstração" para ver como ela chega para você: agenda, clientes, financeiro e relatórios.',
  ];
  if (info.expiresAt) {
    lines.push("", `A prévia fica no ar até ${formatDateLabel(utcToLocalDate(info.expiresAt, info.timezone), info.timezone)}.`);
  }
  return lines.join("\n");
}

export function buildDeliveryChecklist(info: DeliveryInfo): string[] {
  return [
    `Abrir ${info.publicUrl} no celular: logo, cor, serviços e equipe certos`,
    "Fazer uma reserva de teste e cancelar pelo link do e-mail/WhatsApp",
    "Conferir preços, durações e o expediente de cada profissional",
    "Mandar a mensagem ao dono e confirmar que ele criou o acesso",
    "Marcar o check-in de 7 dias com o dono",
  ];
}
