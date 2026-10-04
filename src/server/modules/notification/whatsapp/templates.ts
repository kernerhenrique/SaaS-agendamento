import type { MessageKind } from "@/generated/prisma/enums";

/**
 * Modelos de mensagem do WhatsApp. Módulo puro (sem banco): usado pelo
 * servidor para montar o texto e pela tela de Mensagens para a prévia.
 * Sem registro em `MessageTemplate`, vale o padrão daqui.
 */

export const MESSAGE_KINDS: MessageKind[] = ["CONFIRMATION", "REMINDER", "FOLLOW_UP", "CANCELLATION", "RESCHEDULE"];

export const MESSAGE_KIND_LABELS: Record<MessageKind, string> = {
  CONFIRMATION: "Confirmação",
  REMINDER: "Lembrete",
  FOLLOW_UP: "Pós-atendimento",
  CANCELLATION: "Cancelamento",
  RESCHEDULE: "Remarcação",
};

export const MESSAGE_KIND_DESCRIPTIONS: Record<MessageKind, string> = {
  CONFIRMATION: "Logo depois de marcar, com o link para cancelar ou remarcar.",
  REMINDER: "Na véspera, com o link para cancelar ou remarcar: quem não vai libera o horário.",
  FOLLOW_UP: "Depois do atendimento, agradecendo e com o link para reservar de novo.",
  CANCELLATION: "Quando você cancela pelo painel, avisando o cliente e com o link para reservar outro horário.",
  RESCHEDULE: "Quando você muda o horário pelo painel, com o novo dia e hora.",
};

/**
 * Quais mensagens fazem sentido para o agendamento agora: lembrete e
 * confirmação só antes do horário; pós-atendimento só depois de concluído;
 * aviso de cancelamento só se cancelado.
 */
export function messageKindsFor(status: string, startAt: Date, now: Date): MessageKind[] {
  const active = status === "PENDING" || status === "CONFIRMED";
  const upcoming = startAt.getTime() > now.getTime();
  return MESSAGE_KINDS.filter((kind) => {
    if (kind === "CONFIRMATION" || kind === "REMINDER" || kind === "RESCHEDULE") return active && upcoming;
    if (kind === "FOLLOW_UP") return status === "COMPLETED";
    return status === "CANCELLED";
  });
}

/** Textos neutros (sem termo de nicho): os termos entram pelas variáveis. */
export const DEFAULT_TEMPLATES: Record<MessageKind, string> = {
  CONFIRMATION: [
    "Olá, {primeiro_nome}! Seu horário em {negocio} está confirmado:",
    "{servico} com {profissional}",
    "{data} às {hora}",
    "Endereço: {endereco}",
    "",
    "Se precisar cancelar ou remarcar: {link}",
  ].join("\n"),
  REMINDER: [
    "Oi, {primeiro_nome}! Passando para lembrar do seu horário em {negocio}:",
    "{servico} com {profissional}",
    "{data} às {hora}",
    "Endereço: {endereco}",
    "",
    "Se não puder vir, cancele ou remarque por aqui: {link}",
  ].join("\n"),
  FOLLOW_UP: [
    "Olá, {primeiro_nome}! Obrigado pela visita em {negocio}.",
    "Quando quiser voltar, é só reservar por aqui: {link_reserva}",
  ].join("\n"),
  CANCELLATION: [
    "Olá, {primeiro_nome}. Precisamos cancelar seu horário em {negocio}:",
    "{servico} com {profissional}",
    "{data} às {hora}",
    "",
    "Desculpe o transtorno. Para marcar outro horário: {link_reserva}",
  ].join("\n"),
  RESCHEDULE: [
    "Olá, {primeiro_nome}! Seu horário em {negocio} mudou. O novo horário é:",
    "{servico} com {profissional}",
    "{data} às {hora}",
    "Endereço: {endereco}",
    "",
    "Se precisar cancelar ou remarcar: {link}",
  ].join("\n"),
};

export const MAX_TEMPLATE_LENGTH = 1000;

export const TEMPLATE_VARIABLES = [
  "cliente",
  "primeiro_nome",
  "servico",
  "profissional",
  "data",
  "hora",
  "negocio",
  "endereco",
  "link",
  "link_reserva",
] as const;

export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];
export type TemplateValues = Record<TemplateVariable, string>;

const VARIABLE_PATTERN = /\{([a-z_]+)\}/g;
const isKnownVariable = (name: string): name is TemplateVariable => (TEMPLATE_VARIABLES as readonly string[]).includes(name);

/**
 * Preenche as variáveis. Variável desconhecida fica como está (o dono vê o erro
 * de digitação na prévia). Linha que usa uma variável vazia some inteira — ex.:
 * "Endereço: {endereco}" num negócio sem endereço —, e linhas em branco
 * repetidas viram uma só.
 */
export function renderTemplate(body: string, values: TemplateValues): string {
  const lines = body.split(/\r?\n/).filter((line) => {
    const used = [...line.matchAll(VARIABLE_PATTERN)].map((match) => match[1]).filter(isKnownVariable);
    return used.every((name) => values[name].trim() !== "");
  });
  return lines
    .map((line) => line.replace(VARIABLE_PATTERN, (whole, name: string) => (isKnownVariable(name) ? values[name] : whole)))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Variáveis escritas no modelo que não existem (para avisar no editor). */
export function unknownVariables(body: string): string[] {
  return [...new Set([...body.matchAll(VARIABLE_PATTERN)].map((match) => match[1]).filter((name) => !isKnownVariable(name)))];
}

export interface MessageContext {
  clientName: string;
  serviceName: string;
  professionalName: string;
  businessName: string;
  businessAddress: string | null;
  startAt: Date;
  timeZone: string;
  manageUrl: string;
  /** Página de reservas do negócio (aprazzo.com.br/{slug}), para "reservar de novo". */
  bookingUrl: string;
}

/** Valores das variáveis para um agendamento. Data "quarta-feira, 30/09"; hora "17:30". */
export function buildTemplateValues(context: MessageContext): TemplateValues {
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: context.timeZone, ...options }).format(context.startAt);
  const clientName = context.clientName.trim();
  return {
    cliente: clientName,
    primeiro_nome: clientName.split(/\s+/)[0] ?? "",
    servico: context.serviceName,
    profissional: context.professionalName,
    data: `${format({ weekday: "long" })}, ${format({ day: "2-digit", month: "2-digit" })}`,
    hora: format({ hour: "2-digit", minute: "2-digit" }),
    negocio: context.businessName,
    endereco: context.businessAddress ?? "",
    link: context.manageUrl,
    link_reserva: context.bookingUrl,
  };
}
