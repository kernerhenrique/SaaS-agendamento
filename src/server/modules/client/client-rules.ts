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

/** Busca por nome (sem acento, sem caixa) ou por parte do telefone (só dígitos). */
export function matchesClientSearch(client: { name: string; phone: string }, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  const digits = q.replace(/\D/g, "");
  if (digits.length >= 3 && client.phone.includes(digits)) return true;
  return foldText(client.name).includes(foldText(q));
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
