import { Weekday } from "@/generated/prisma/enums";
import { normalizePhoneBR } from "@/lib/phone";
import { ValidationError } from "@/server/errors";

/**
 * Validação das Configurações do negócio. Funções puras: recebem o corpo cru
 * da requisição e devolvem os dados já normalizados para gravar, ou lançam
 * `ValidationError` com mensagem pronta para a tela.
 */

export const POLICY_LIMITS = {
  minBookingNoticeMinutes: { min: 0, max: 7 * 24 * 60 },
  maxBookingWindowDays: { min: 1, max: 365 },
  cancellationDeadlineHours: { min: 0, max: 7 * 24 },
} as const;

const TEXT_LIMITS = { name: 80, address: 200, policyText: 1000, url: 500 } as const;

type Body = Record<string, unknown>;

function optionalText(value: unknown, field: string, max: number): string | null {
  if (value == null) return null;
  if (typeof value !== "string") throw new ValidationError(`${field} deve ser texto`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw new ValidationError(`${field} pode ter no máximo ${max} caracteres`);
  return trimmed === "" ? null : trimmed;
}

/** Link de imagem (logo/capa): só https, para não gerar conteúdo misto na página pública. */
export function parseImageUrl(value: unknown, field: string): string | null {
  const text = optionalText(value, field, TEXT_LIMITS.url);
  if (text == null) return null;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new ValidationError(`${field}: cole um link completo, começando com https://`);
  }
  if (url.protocol !== "https:") {
    throw new ValidationError(`${field}: o link precisa começar com https://`);
  }
  return url.toString();
}

/** Aceita "@perfil", "perfil" ou o link completo; grava sempre o link. */
export function parseInstagram(value: unknown): string | null {
  const text = optionalText(value, "Instagram", TEXT_LIMITS.url);
  if (text == null) return null;
  const fromUrl = /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([A-Za-z0-9._]+)\/?(?:\?.*)?$/i.exec(text);
  const handle = fromUrl ? fromUrl[1] : text.replace(/^@/, "");
  if (!/^[A-Za-z0-9._]{1,30}$/.test(handle)) {
    throw new ValidationError("Instagram: informe o @ do perfil ou o link");
  }
  return `https://instagram.com/${handle}`;
}

/** WhatsApp do negócio: DDD + número (10 ou 11 dígitos), gravado só com dígitos. */
export function parseBusinessWhatsapp(value: unknown): string | null {
  const text = optionalText(value, "WhatsApp", 30);
  if (text == null) return null;
  const digits = normalizePhoneBR(text);
  const withoutCountry = digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits;
  if (withoutCountry.length < 10 || withoutCountry.length > 11) {
    throw new ValidationError("WhatsApp: informe DDD e número");
  }
  return withoutCountry;
}

export function parseAccentColor(value: unknown): string {
  if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value.trim())) {
    throw new ValidationError("Cor de marca: use o formato #RRGGBB");
  }
  return value.trim().toUpperCase();
}

export interface BusinessProfileInput {
  name: string;
  address: string | null;
  whatsapp: string | null;
  instagramUrl: string | null;
}

/**
 * Dados do negócio editáveis pelo dono. O tipo de negócio (preset de nicho)
 * NÃO entra: é definido na criação do cliente (seed / script de clonagem) e
 * só muda pelo suporte — um campo `businessType` no corpo é ignorado.
 */
export function parseBusinessProfile(body: Body): BusinessProfileInput {
  const name = optionalText(body.name, "Nome", TEXT_LIMITS.name);
  if (!name) throw new ValidationError("Informe o nome do negócio");
  return {
    name,
    address: optionalText(body.address, "Endereço", TEXT_LIMITS.address),
    whatsapp: parseBusinessWhatsapp(body.whatsapp),
    instagramUrl: parseInstagram(body.instagramUrl),
  };
}

export interface BrandingInput {
  logoUrl: string | null;
  coverUrl: string | null;
  accentColor: string;
}

export function parseBranding(body: Body): BrandingInput {
  return {
    logoUrl: parseImageUrl(body.logoUrl, "Logo"),
    coverUrl: parseImageUrl(body.coverUrl, "Capa"),
    accentColor: parseAccentColor(body.accentColor),
  };
}

export interface BookingPoliciesInput {
  minBookingNoticeMinutes: number;
  maxBookingWindowDays: number;
  cancellationDeadlineHours: number;
  policyText: string | null;
}

function integerInRange(value: unknown, field: keyof typeof POLICY_LIMITS, label: string): number {
  const { min, max } = POLICY_LIMITS[field];
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new ValidationError(`${label}: use um número inteiro entre ${min} e ${max}`);
  }
  return value;
}

export function parseBookingPolicies(body: Body): BookingPoliciesInput {
  return {
    minBookingNoticeMinutes: integerInRange(body.minBookingNoticeMinutes, "minBookingNoticeMinutes", "Antecedência mínima (minutos)"),
    maxBookingWindowDays: integerInRange(body.maxBookingWindowDays, "maxBookingWindowDays", "Janela de reserva (dias)"),
    cancellationDeadlineHours: integerInRange(body.cancellationDeadlineHours, "cancellationDeadlineHours", "Prazo para cancelar (horas)"),
    policyText: optionalText(body.policyText, "Políticas", TEXT_LIMITS.policyText),
  };
}

export interface BusinessHoursInput {
  weekday: Weekday;
  startMinute: number;
  endMinute: number;
}

const WEEKDAYS = new Set<string>(Object.values(Weekday));

/** Horário de funcionamento: um intervalo por dia; dia ausente = fechado. */
export function parseBusinessHours(value: unknown): BusinessHoursInput[] {
  if (!Array.isArray(value)) throw new ValidationError("Horário de funcionamento inválido");
  const seen = new Set<string>();
  return value.map((item: unknown) => {
    const entry = (item ?? {}) as Body;
    const { weekday, startMinute, endMinute } = entry;
    if (typeof weekday !== "string" || !WEEKDAYS.has(weekday)) {
      throw new ValidationError("Dia da semana inválido");
    }
    if (seen.has(weekday)) throw new ValidationError("Cada dia só pode aparecer uma vez");
    seen.add(weekday);
    if (
      typeof startMinute !== "number" ||
      typeof endMinute !== "number" ||
      !Number.isInteger(startMinute) ||
      !Number.isInteger(endMinute) ||
      startMinute < 0 ||
      endMinute > 24 * 60 ||
      startMinute >= endMinute
    ) {
      throw new ValidationError("O horário de fechamento precisa ser depois da abertura");
    }
    return { weekday: weekday as Weekday, startMinute, endMinute };
  });
}

export interface SoloHoursInput extends BusinessHoursInput {
  breakStartMinute: number | null;
  breakEndMinute: number | null;
}

/**
 * Plano Solo: um horário só, com intervalo. Quem atende sozinho abre quando
 * atende, então a mesma semana vira o horário da página (sem o intervalo) e o
 * expediente de onde saem os horários livres (com o intervalo).
 */
export function parseSoloHours(value: unknown): SoloHoursInput[] {
  const hours = parseBusinessHours(value);
  return hours.map((day, index) => {
    const entry = ((value as unknown[])[index] ?? {}) as Body;
    const breakStart = entry.breakStartMinute ?? null;
    const breakEnd = entry.breakEndMinute ?? null;
    if (breakStart === null && breakEnd === null) return { ...day, breakStartMinute: null, breakEndMinute: null };
    if (
      typeof breakStart !== "number" ||
      typeof breakEnd !== "number" ||
      !Number.isInteger(breakStart) ||
      !Number.isInteger(breakEnd) ||
      breakStart < day.startMinute ||
      breakEnd > day.endMinute ||
      breakStart >= breakEnd
    ) {
      throw new ValidationError("O intervalo precisa ficar dentro do horário do dia, com o fim depois do início");
    }
    return { ...day, breakStartMinute: breakStart, breakEndMinute: breakEnd };
  });
}

/** Plano Solo: o nome de quem atende ("com Ana" no resumo da reserva e no e-mail). */
export function parseSoloProfessionalName(value: unknown): string {
  const name = optionalText(value, "Seu nome", TEXT_LIMITS.name);
  if (!name) throw new ValidationError("Informe o seu nome (aparece na reserva)");
  return name;
}
