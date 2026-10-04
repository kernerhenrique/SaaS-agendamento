import type { AppointmentStatus } from "@/generated/prisma/enums";

/**
 * Regras puras da tela de Clientes (mini-CRM): resumo por cliente, filtros e
 * normalização de tags. Sem banco — testadas em tests/unit/client-rules.spec.ts.
 */

export const CLIENT_FILTERS = ["todos", "sumidos-30", "sumidos-60", "sumidos-90", "mais-faltas", "mais-atendimentos"] as const;
export type ClientFilter = (typeof CLIENT_FILTERS)[number];

export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 30;

export interface ClientSummary {
  completed: number;
  noShows: number;
  /** Último atendimento concluído. */
  lastVisitAt: Date | null;
  /** Próximo agendamento em aberto (pendente/confirmado) a partir de agora. */
  nextAppointmentAt: Date | null;
}

export function summarizeClient(appointments: { status: AppointmentStatus; startAt: Date }[], now: Date): ClientSummary {
  let completed = 0;
  let noShows = 0;
  let lastVisitAt: Date | null = null;
  let nextAppointmentAt: Date | null = null;
  for (const a of appointments) {
    if (a.status === "COMPLETED") {
      completed++;
      if (!lastVisitAt || a.startAt > lastVisitAt) lastVisitAt = a.startAt;
    } else if (a.status === "NO_SHOW") {
      noShows++;
    } else if ((a.status === "PENDING" || a.status === "CONFIRMED") && a.startAt >= now) {
      if (!nextAppointmentAt || a.startAt < nextAppointmentAt) nextAppointmentAt = a.startAt;
    }
  }
  return { completed, noShows, lastVisitAt, nextAppointmentAt };
}

export function parseClientFilter(value: string | null | undefined): ClientFilter {
  return CLIENT_FILTERS.includes(value as ClientFilter) ? (value as ClientFilter) : "todos";
}

/**
 * "Sumido há N dias": já foi atendido, o último atendimento concluído é mais
 * antigo que N dias e não tem nada marcado para frente (mesma regra do alerta
 * do Início).
 */
export function isInactive(summary: ClientSummary, days: number, now: Date): boolean {
  if (!summary.lastVisitAt || summary.nextAppointmentAt) return false;
  return summary.lastVisitAt.getTime() < now.getTime() - days * 24 * 60 * 60 * 1000;
}

/** Aplica o filtro e a ordenação da lista. Sem filtro: ordem alfabética (já vem do banco). */
export function applyClientFilter<T extends { summary: ClientSummary }>(rows: T[], filter: ClientFilter, now: Date): T[] {
  switch (filter) {
    case "sumidos-30":
    case "sumidos-60":
    case "sumidos-90": {
      const days = Number(filter.split("-")[1]);
      return rows
        .filter((row) => isInactive(row.summary, days, now))
        .sort((a, b) => a.summary.lastVisitAt!.getTime() - b.summary.lastVisitAt!.getTime());
    }
    case "mais-faltas":
      return rows.filter((row) => row.summary.noShows > 0).sort((a, b) => b.summary.noShows - a.summary.noShows);
    case "mais-atendimentos":
      return rows.filter((row) => row.summary.completed > 0).sort((a, b) => b.summary.completed - a.summary.completed);
    default:
      return rows;
  }
}

/** Busca por nome ou tag (sem acento, sem caixa) ou por parte do telefone (só dígitos). */
export function matchesClientSearch(client: { name: string; phone: string; tags?: string[] }, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  const digits = q.replace(/\D/g, "");
  if (digits.length >= 3 && client.phone.includes(digits)) return true;
  const folded = foldText(q);
  return foldText(client.name).includes(folded) || (client.tags ?? []).some((tag) => foldText(tag).includes(folded));
}

/** Filtro por uma tag exata (sem caixa e sem acento). Sem tag escolhida, passa todo mundo. */
export function hasTag(client: { tags: string[] }, tag: string | null | undefined): boolean {
  if (!tag) return true;
  const wanted = foldText(tag.trim());
  return client.tags.some((own) => foldText(own) === wanted);
}

/** Todas as tags em uso, sem repetir (ignorando caixa), em ordem alfabética. */
export function collectTags(clients: { tags: string[] }[]): string[] {
  const byKey = new Map<string, string>();
  for (const client of clients) for (const tag of client.tags) if (!byKey.has(foldText(tag))) byKey.set(foldText(tag), tag);
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

// --- Exclusão (LGPD) ---------------------------------------------------------

export const DELETED_CLIENT_NAME = "Cliente excluído";

/**
 * Telefone de um cadastro excluído: marcador único, sem dígitos de verdade —
 * libera o número (a pessoa pode voltar como cliente novo) e nunca casa com a
 * busca por telefone nem com a deduplicação da reserva.
 */
export function deletedClientPhone(clientId: string): string {
  return `excluido-${clientId}`;
}

const MAX_NAME_LENGTH = 80;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Nome, WhatsApp e e-mail ao corrigir o cadastro (telefone só com dígitos, com DDD). */
export function parseClientContact(input: { name: unknown; phone: unknown; email: unknown }, normalizePhone: (raw: string) => string) {
  const name = typeof input.name === "string" ? input.name.trim().replace(/\s+/g, " ") : "";
  if (!name) throw new Error("Informe o nome");
  if (name.length > MAX_NAME_LENGTH) throw new Error(`O nome pode ter no máximo ${MAX_NAME_LENGTH} caracteres`);
  let phone = typeof input.phone === "string" ? normalizePhone(input.phone) : "";
  if (phone.length >= 12 && phone.startsWith("55")) phone = phone.slice(2); // "+55" colado do WhatsApp
  if (phone.length < 10 || phone.length > 11) throw new Error("WhatsApp inválido: informe DDD e número");
  const emailRaw = typeof input.email === "string" ? input.email.trim() : "";
  if (emailRaw && !EMAIL_PATTERN.test(emailRaw)) throw new Error("E-mail inválido");
  return { name, phone, email: emailRaw || null };
}

function foldText(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** Tags: sem espaços sobrando, sem repetidas (ignorando caixa), no máximo 10 de até 30 caracteres. */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().replace(/\s+/g, " ").slice(0, MAX_TAG_LENGTH);
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
    if (result.length === MAX_TAGS) break;
  }
  return result;
}
