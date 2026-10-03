import type { MessageKind } from "@/generated/prisma/enums";

/**
 * Modelos de mensagem do WhatsApp. Módulo puro (sem banco): usado pelo
 * servidor para montar o texto e pela tela de Mensagens para a prévia.
 * Sem registro em `MessageTemplate`, vale o padrão daqui.
 */

export const MESSAGE_KINDS: MessageKind[] = ["CONFIRMATION", "REMINDER", "FOLLOW_UP"];

export const MESSAGE_KIND_LABELS: Record<MessageKind, string> = {
  CONFIRMATION: "Confirmação",
  REMINDER: "Lembrete",
  FOLLOW_UP: "Pós-atendimento",
};

export const MESSAGE_KIND_DESCRIPTIONS: Record<MessageKind, string> = {
  CONFIRMATION: "Logo depois de marcar, com o link para confirmar presença, remarcar ou cancelar.",
  REMINDER: "Na véspera, pedindo para confirmar presença pelo link: diminui as faltas.",
  FOLLOW_UP: "Depois do atendimento, agradecendo e com o link para reservar de novo.",
};

/** Textos neutros (sem termo de nicho): os termos entram pelas variáveis. */
export const DEFAULT_TEMPLATES: Record<MessageKind, string> = {
  CONFIRMATION: [
    "Olá, {primeiro_nome}! Seu horário em {negocio} está reservado:",
    "{servico} com {profissional}",
    "{data} às {hora}",
    "Endereço: {endereco}",
    "",
    "Confirme sua presença, remarque ou cancele por aqui: {link}",
  ].join("\n"),
  REMINDER: [
    "Oi, {primeiro_nome}! Passando para lembrar do seu horário em {negocio}:",
    "{servico} com {profissional}",
    "{data} às {hora}",
    "Endereço: {endereco}",
    "",
    "Toque no link para confirmar sua presença: {link}",
    "Se não puder vir, por ele mesmo você remarca ou cancela.",
  ].join("\n"),
  FOLLOW_UP: [
    "Olá, {primeiro_nome}! Obrigado pela visita em {negocio}.",
    "Quando quiser voltar, é só reservar por aqui: {link_reserva}",
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
