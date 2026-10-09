import { getVertical, isVerticalKey, type VerticalKey } from "@/config/vertical";
import { Weekday } from "@/generated/prisma/enums";
import { AA_CONTRAST, accentContrast, DEFAULT_ACCENT_COLOR } from "@/lib/accent-color";
import { PROFESSIONAL_COLORS, isProfessionalColorKey, type ProfessionalColorKey } from "@/lib/professional-colors";
import { isReservedSlug, SLUG_LENGTH, SLUG_PATTERN } from "@/lib/reserved-slugs";
import { ValidationError } from "@/server/errors";
import { describeHoursConflict, findHoursConflicts } from "@/server/modules/business/hours-rules";
import { parseProfessionalLimit } from "@/server/modules/business/plan-rules";
import {
  parseAccentColor,
  parseBookingPolicies,
  parseBusinessProfile,
  POLICY_LIMITS,
  type BookingPoliciesInput,
  type BusinessHoursInput,
} from "@/server/modules/business/business-rules";

import { NICHE_CATALOGS, type CatalogService } from "./niche-catalogs";

/**
 * Arquivo do cliente (`clientes/<slug>.json`) → dados prontos para criar o
 * negócio. Função pura: o script `npm run novo-cliente` lê o arquivo, chama
 * isto e só então toca no banco. Campos em português, no formato que o dono
 * fala ("seg-sex", "09:00-19:00", "45,90"); exemplo em docs/exemplo-cliente.json.
 */

export interface NewProfessionalInput {
  name: string;
  specialty: string | null;
  color: ProfessionalColorKey;
  commissionPercent: number | null;
  workingHours: { weekday: Weekday; startMinute: number; endMinute: number; breakStartMinute: number | null; breakEndMinute: number | null }[];
  /** Nomes dos serviços que ele realiza (todos, se o arquivo não disser). */
  serviceNames: string[];
}

export interface NewClientInput {
  name: string;
  slug: string;
  businessType: VerticalKey;
  timezone: string;
  address: string | null;
  whatsapp: string | null;
  instagramUrl: string | null;
  accentColor: string;
  /** Caminhos das imagens como vieram no arquivo (o script resolve e envia ao Blob). */
  logoFile: string | null;
  coverFile: string | null;
  businessHours: BusinessHoursInput[];
  policies: BookingPoliciesInput;
  services: CatalogService[];
  professionals: NewProfessionalInput[];
  /** Limite do plano (profissionais ativos): 1 no Solo; 3, 8 ou 15 no Modelo B; null = sem limite. */
  maxProfessionals: number | null;
}

type Body = Record<string, unknown>;

const DAY_KEYS: Record<string, Weekday> = {
  dom: Weekday.SUNDAY,
  seg: Weekday.MONDAY,
  ter: Weekday.TUESDAY,
  qua: Weekday.WEDNESDAY,
  qui: Weekday.THURSDAY,
  sex: Weekday.FRIDAY,
  sab: Weekday.SATURDAY,
};
const WEEK_ORDER = [Weekday.SUNDAY, Weekday.MONDAY, Weekday.TUESDAY, Weekday.WEDNESDAY, Weekday.THURSDAY, Weekday.FRIDAY, Weekday.SATURDAY];

function asBody(value: unknown): Body {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Body) : {};
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function dayKey(raw: string): Weekday {
  const key = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .slice(0, 3);
  const weekday = DAY_KEYS[key];
  if (!weekday) throw new ValidationError(`Dia da semana desconhecido: "${raw}" (use dom, seg, ter, qua, qui, sex, sab)`);
  return weekday;
}

/** "seg-sex", "seg,qua,sex", "sab" ou "ter-sab, dom" → dias da semana, sem repetir. */
export function parseDays(value: unknown): Weekday[] {
  const raw = text(value);
  if (!raw) throw new ValidationError('Informe os dias (ex.: "seg-sex")');
  const days = new Set<Weekday>();
  for (const part of raw.split(",")) {
    const [from, to] = part.split("-");
    if (to === undefined) {
      days.add(dayKey(from));
      continue;
    }
    const start = WEEK_ORDER.indexOf(dayKey(from));
    const end = WEEK_ORDER.indexOf(dayKey(to));
    for (let i = start; ; i = (i + 1) % 7) {
      days.add(WEEK_ORDER[i]);
      if (i === end) break;
    }
  }
  return WEEK_ORDER.filter((day) => days.has(day));
}

/** "09:00" → minutos desde a meia-noite. */
export function parseTime(value: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) throw new ValidationError(`Horário inválido: "${value}" (use HH:MM)`);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 24 || minutes > 59 || (hours === 24 && minutes > 0)) throw new ValidationError(`Horário inválido: "${value}"`);
  return hours * 60 + minutes;
}

/** "09:00-19:00" → { start, end }, com o fim depois do início. */
export function parseTimeRange(value: unknown): { start: number; end: number } {
  const raw = text(value);
  const parts = raw?.split("-");
  if (!raw || parts?.length !== 2) throw new ValidationError(`Intervalo inválido: "${String(value)}" (use "09:00-19:00")`);
  const start = parseTime(parts[0]);
  const end = parseTime(parts[1]);
  if (end <= start) throw new ValidationError(`O fim precisa ser depois do início: "${raw}"`);
  return { start, end };
}

/** 45, "45", "45,90" ou "R$ 1.234,56" → centavos. */
export function parsePriceCents(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return Math.round(value * 100);
  const raw = text(value);
  if (raw) {
    const normalized = raw.replace(/r\$\s*/i, "").replace(/\./g, "").replace(",", ".");
    const amount = Number(normalized);
    if (Number.isFinite(amount) && amount >= 0) return Math.round(amount * 100);
  }
  throw new ValidationError(`Preço inválido: "${String(value)}" (ex.: 45 ou "45,90")`);
}

/** Nome do negócio → slug sugerido ("Barbearia do Zé" → "barbearia-do-ze"). */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_LENGTH.max)
    .replace(/-+$/, "");
}

export function parseSlug(value: unknown): string {
  const slug = text(value)?.toLowerCase() ?? "";
  if (slug.length < SLUG_LENGTH.min || slug.length > SLUG_LENGTH.max || !SLUG_PATTERN.test(slug)) {
    throw new ValidationError(
      `Endereço "${slug}": use de ${SLUG_LENGTH.min} a ${SLUG_LENGTH.max} letras minúsculas, números e hífen (ex.: barbearia-do-ze)`,
    );
  }
  if (isReservedSlug(slug)) throw new ValidationError(`O endereço "${slug}" é reservado pela Aprazzo; escolha outro`);
  return slug;
}

function parseTimezone(value: unknown): string {
  const timezone = text(value) ?? "America/Sao_Paulo";
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone: timezone });
  } catch {
    throw new ValidationError(`Fuso horário desconhecido: "${timezone}" (ex.: America/Sao_Paulo)`);
  }
  return timezone;
}

/** `[{ "dias": "seg-sex", "horario": "09:00-19:00" }]` → um intervalo por dia. */
function parseBusinessHoursList(value: unknown): BusinessHoursInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ValidationError('Informe o horário de funcionamento (ex.: [{ "dias": "seg-sex", "horario": "09:00-19:00" }])');
  }
  const byDay = new Map<Weekday, BusinessHoursInput>();
  for (const item of value) {
    const entry = asBody(item);
    const { start, end } = parseTimeRange(entry.horario);
    for (const weekday of parseDays(entry.dias)) {
      if (byDay.has(weekday)) throw new ValidationError("Horário de funcionamento: cada dia só pode aparecer uma vez");
      byDay.set(weekday, { weekday, startMinute: start, endMinute: end });
    }
  }
  return WEEK_ORDER.flatMap((day) => byDay.get(day) ?? []);
}

function parseWorkingHours(value: unknown, fallback: BusinessHoursInput[], who: string): NewProfessionalInput["workingHours"] {
  if (value === undefined) {
    return fallback.map((day) => ({ ...day, breakStartMinute: null, breakEndMinute: null }));
  }
  if (!Array.isArray(value) || value.length === 0) throw new ValidationError(`${who}: expediente inválido`);
  const byDay = new Map<Weekday, NewProfessionalInput["workingHours"][number]>();
  for (const item of value) {
    const entry = asBody(item);
    const { start, end } = parseTimeRange(entry.horario);
    const pause = entry.intervalo === undefined ? null : parseTimeRange(entry.intervalo);
    if (pause && (pause.start <= start || pause.end >= end)) {
      throw new ValidationError(`${who}: o intervalo precisa ficar dentro do expediente`);
    }
    for (const weekday of parseDays(entry.dias)) {
      if (byDay.has(weekday)) throw new ValidationError(`${who}: cada dia só pode aparecer uma vez no expediente`);
      byDay.set(weekday, {
        weekday,
        startMinute: start,
        endMinute: end,
        breakStartMinute: pause?.start ?? null,
        breakEndMinute: pause?.end ?? null,
      });
    }
  }
  return WEEK_ORDER.flatMap((day) => byDay.get(day) ?? []);
}

function parseServices(value: unknown, businessType: VerticalKey): CatalogService[] {
  if (value === undefined) return NICHE_CATALOGS[businessType];
  if (!Array.isArray(value) || value.length === 0) throw new ValidationError("Serviços: informe uma lista ou omita para usar o catálogo do nicho");
  const names = new Set<string>();
  return value.map((item, index) => {
    const entry = asBody(item);
    const name = text(entry.nome);
    if (!name) throw new ValidationError(`Serviço ${index + 1}: informe o nome`);
    if (names.has(name.toLowerCase())) throw new ValidationError(`Serviço repetido: "${name}"`);
    names.add(name.toLowerCase());
    const durationMin = entry.duracao;
    if (typeof durationMin !== "number" || !Number.isInteger(durationMin) || durationMin < 5 || durationMin > 12 * 60) {
      throw new ValidationError(`Serviço "${name}": duração em minutos (número inteiro, ex.: 30)`);
    }
    return {
      name,
      category: text(entry.categoria) ?? "Serviços",
      durationMin,
      priceCents: parsePriceCents(entry.preco),
      priceFrom: entry.aPartirDe === true,
      description: text(entry.descricao) ?? undefined,
    };
  });
}

function parseProfessionals(
  value: unknown,
  businessHours: BusinessHoursInput[],
  services: CatalogService[],
  businessType: VerticalKey,
  warnings: string[],
): NewProfessionalInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ValidationError("Informe pelo menos um profissional (sem ninguém atendendo, a página não tem horários)");
  }
  const serviceNames = new Map(services.map((service) => [service.name.toLowerCase(), service.name]));
  const commissionsOn = getVertical(businessType).features.commissions;
  return value.map((item, index) => {
    const entry = asBody(item);
    const name = text(entry.nome);
    if (!name) throw new ValidationError(`Profissional ${index + 1}: informe o nome`);

    const color = entry.cor === undefined ? PROFESSIONAL_COLORS[index % PROFESSIONAL_COLORS.length].key : entry.cor;
    if (!isProfessionalColorKey(color)) {
      throw new ValidationError(`${name}: cor "${String(color)}" não existe (use ${PROFESSIONAL_COLORS.map((c) => c.key).join(", ")})`);
    }

    let commissionPercent: number | null = null;
    if (entry.comissao !== undefined) {
      const value = entry.comissao;
      if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 100) {
        throw new ValidationError(`${name}: comissão em % inteiro de 0 a 100`);
      }
      commissionPercent = value;
      if (!commissionsOn) warnings.push(`${name}: o nicho não usa comissão; a % fica gravada, mas não aparece nas telas`);
    }

    let names = services.map((service) => service.name);
    if (entry.servicos !== undefined) {
      if (!Array.isArray(entry.servicos) || entry.servicos.length === 0) throw new ValidationError(`${name}: lista de serviços inválida`);
      names = entry.servicos.map((raw) => {
        const found = typeof raw === "string" ? serviceNames.get(raw.trim().toLowerCase()) : undefined;
        if (!found) throw new ValidationError(`${name}: serviço "${String(raw)}" não está na lista de serviços`);
        return found;
      });
    }

    const workingHours = parseWorkingHours(entry.expediente, businessHours, name);
    if (workingHours.length === 0) throw new ValidationError(`${name}: o expediente precisa de pelo menos um dia`);
    // Mesma regra do painel: o expediente cabe no horário de funcionamento.
    const conflicts = findHoursConflicts(businessHours, workingHours);
    if (conflicts.length > 0) {
      throw new ValidationError(`${name}: o expediente passa do horário de funcionamento (${conflicts.map(describeHoursConflict).join("; ")})`);
    }

    return { name, specialty: text(entry.especialidade), color, commissionPercent, workingHours, serviceNames: names };
  });
}

export function parseClientFile(raw: unknown): { input: NewClientInput; warnings: string[] } {
  const body = asBody(raw);
  const warnings: string[] = [];

  const nicho = text(body.nicho);
  if (!nicho || !isVerticalKey(nicho)) {
    throw new ValidationError(`Nicho inválido: "${String(body.nicho)}" (use barbershop, beauty_clinic, tattoo_studio ou generic)`);
  }

  const profile = parseBusinessProfile({ name: body.nome, address: body.endereco, whatsapp: body.whatsapp, instagramUrl: body.instagram });
  const slug = parseSlug(body.slug ?? slugify(profile.name));
  if (!profile.whatsapp) warnings.push("Sem WhatsApp do negócio: a página pública fica sem o botão de contato");

  const accentColor = body.cor === undefined ? DEFAULT_ACCENT_COLOR.toUpperCase() : parseAccentColor(body.cor);
  const contrast = accentContrast(accentColor);
  if (contrast.onButton < AA_CONTRAST) {
    warnings.push(`Cor ${accentColor}: o texto dos botões fica com contraste ${contrast.onButton.toFixed(1)}:1 (abaixo de 4,5:1)`);
  }
  if (contrast.onLightBackground < 3) {
    warnings.push(`Cor ${accentColor}: clara demais para links e textos sobre fundo branco (${contrast.onLightBackground.toFixed(1)}:1)`);
  }

  const businessHours = parseBusinessHoursList(body.horarioFuncionamento);
  const policyBody = asBody(body.politicas);
  const policies = parseBookingPolicies({
    minBookingNoticeMinutes: policyBody.antecedenciaMinutos ?? POLICY_LIMITS.minBookingNoticeMinutes.min,
    maxBookingWindowDays: policyBody.janelaDias ?? 60,
    cancellationDeadlineHours: policyBody.cancelamentoHoras ?? POLICY_LIMITS.cancellationDeadlineHours.min,
    policyText: policyBody.texto,
  });

  const services = parseServices(body.servicos, nicho);
  const professionals = parseProfessionals(body.profissionais, businessHours, services, nicho, warnings);
  let maxProfessionals: number | null;
  try {
    maxProfessionals = parseProfessionalLimit(body.limiteProfissionais);
  } catch (error) {
    throw new ValidationError((error as Error).message);
  }
  if (maxProfessionals !== null && professionals.length > maxProfessionals) {
    throw new ValidationError(
      `O arquivo tem ${professionals.length} profissionais, mas o plano permite ${maxProfessionals}. Ajuste "limiteProfissionais" ou a equipe.`,
    );
  }
  const unused = services.filter((service) => !professionals.some((pro) => pro.serviceNames.includes(service.name)));
  for (const service of unused) warnings.push(`Ninguém realiza "${service.name}": ele não terá horários na página`);

  return {
    input: {
      name: profile.name,
      slug,
      businessType: nicho,
      timezone: parseTimezone(body.fuso),
      address: profile.address,
      whatsapp: profile.whatsapp,
      instagramUrl: profile.instagramUrl,
      accentColor,
      logoFile: text(body.logo),
      coverFile: text(body.capa),
      businessHours,
      policies,
      services,
      professionals,
      maxProfessionals,
    },
    warnings,
  };
}
