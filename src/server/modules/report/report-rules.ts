import type { AppointmentStatus, PaymentMethod } from "@/generated/prisma/enums";
import { addDaysToIsoDate, utcToLocalDate } from "@/lib/date";
import { commissionFor } from "@/server/modules/payment/payment-rules";

/**
 * Regras puras dos Relatórios (sem banco) — tests/unit/report-rules.spec.ts.
 * Dinheiro conta pela data de recebimento; atendimentos pela data do
 * atendimento. Quem chama já filtrou pelo período e pelo businessId.
 */

export interface AppointmentFact {
  id: string;
  status: AppointmentStatus;
  professionalId: string;
  serviceId: string;
  clientId: string;
  startAt: Date;
}

export interface PaymentFact {
  appointmentId: string;
  amountCents: number;
  discountCents: number;
  method: PaymentMethod;
  receivedAt: Date;
  commissionPercent: number | null;
  professionalId: string;
  serviceId: string;
  clientId: string;
}

export interface NamedCount {
  id: string;
  name: string;
  count: number;
}

/** Variação percentual (0.12 = +12%). null quando o anterior é 0 — não dá para dizer "quanto cresceu". */
export function delta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / previous;
}

// ---------------------------------------------------------------------------
// Atendimentos

export interface AppointmentsSummary {
  total: number;
  byStatus: Record<AppointmentStatus, number>;
  cancellationRate: number;
  noShowRate: number;
  byProfessional: NamedCount[];
  mostRequestedProfessional: NamedCount | null;
}

/** Total, por status, taxas e ranking por profissional (inclui cadastros removidos). */
export function summarizeAppointments(
  appointments: Pick<AppointmentFact, "status" | "professionalId">[],
  professionalNames: Map<string, string>,
): AppointmentsSummary {
  const byStatus: Record<AppointmentStatus, number> = { PENDING: 0, CONFIRMED: 0, CANCELLED: 0, COMPLETED: 0, NO_SHOW: 0 };
  const perProfessional = new Map<string, number>();
  for (const appointment of appointments) {
    byStatus[appointment.status] += 1;
    perProfessional.set(appointment.professionalId, (perProfessional.get(appointment.professionalId) ?? 0) + 1);
  }
  const byProfessional = [...perProfessional]
    .map(([id, count]) => ({ id, name: professionalNames.get(id) ?? "(cadastro removido)", count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const total = appointments.length;
  return {
    total,
    byStatus,
    cancellationRate: total === 0 ? 0 : byStatus.CANCELLED / total,
    noShowRate: total === 0 ? 0 : byStatus.NO_SHOW / total,
    byProfessional,
    mostRequestedProfessional: byProfessional[0] ?? null,
  };
}

/** Soma valores por dia local, com zero nos dias sem movimento (gráfico sem "buracos"). */
export function sumByLocalDay(
  items: { at: Date; value: number }[],
  startDate: string,
  endDate: string,
  timeZone: string,
): { date: string; value: number }[] {
  const totals = new Map<string, number>();
  for (let date = startDate; date <= endDate; date = addDaysToIsoDate(date, 1)) totals.set(date, 0);
  for (const item of items) {
    const date = utcToLocalDate(item.at, timeZone);
    if (totals.has(date)) totals.set(date, totals.get(date)! + item.value);
  }
  return [...totals].map(([date, value]) => ({ date, value }));
}

// ---------------------------------------------------------------------------
// Faturamento

export interface RevenueSummary {
  receivedCents: number;
  discountCents: number;
  paymentsCount: number;
  /** Recebido ÷ atendimentos com recebimento no período (mesma regra do Financeiro). */
  averageTicketCents: number | null;
  byMethod: { method: PaymentMethod; amountCents: number; count: number }[];
}

export function summarizeRevenue(
  payments: Pick<PaymentFact, "appointmentId" | "amountCents" | "discountCents" | "method">[],
): RevenueSummary {
  const receivedCents = payments.reduce((sum, p) => sum + p.amountCents, 0);
  const paidAppointments = new Set(payments.filter((p) => p.amountCents > 0).map((p) => p.appointmentId)).size;
  const byMethod = new Map<PaymentMethod, { amountCents: number; count: number }>();
  for (const p of payments) {
    if (p.amountCents === 0) continue; // registro só de desconto não é "forma de pagamento"
    const entry = byMethod.get(p.method) ?? { amountCents: 0, count: 0 };
    entry.amountCents += p.amountCents;
    entry.count += 1;
    byMethod.set(p.method, entry);
  }
  return {
    receivedCents,
    discountCents: payments.reduce((sum, p) => sum + p.discountCents, 0),
    paymentsCount: payments.length,
    averageTicketCents: paidAppointments > 0 ? Math.round(receivedCents / paidAppointments) : null,
    byMethod: [...byMethod.entries()]
      .map(([method, entry]) => ({ method, ...entry }))
      .sort((a, b) => b.amountCents - a.amountCents),
  };
}

// ---------------------------------------------------------------------------
// Serviços

export interface ServiceRow {
  id: string;
  name: string;
  /** Agendamentos não cancelados no período. */
  appointments: number;
  completed: number;
  receivedCents: number;
}

export function summarizeServices(
  appointments: Pick<AppointmentFact, "status" | "serviceId">[],
  payments: Pick<PaymentFact, "serviceId" | "amountCents">[],
  serviceNames: Map<string, string>,
): ServiceRow[] {
  const rows = new Map<string, ServiceRow>();
  const row = (id: string) => {
    let entry = rows.get(id);
    if (!entry) {
      entry = { id, name: serviceNames.get(id) ?? "(cadastro removido)", appointments: 0, completed: 0, receivedCents: 0 };
      rows.set(id, entry);
    }
    return entry;
  };
  for (const a of appointments) {
    if (a.status === "CANCELLED") continue;
    const entry = row(a.serviceId);
    entry.appointments += 1;
    if (a.status === "COMPLETED") entry.completed += 1;
  }
  for (const p of payments) row(p.serviceId).receivedCents += p.amountCents;
  return [...rows.values()].sort(
    (a, b) => b.receivedCents - a.receivedCents || b.appointments - a.appointments || a.name.localeCompare(b.name),
  );
}

// ---------------------------------------------------------------------------
// Profissionais

export interface ProfessionalRow {
  id: string;
  name: string;
  appointments: number;
  completed: number;
  noShows: number;
  /** Faltas ÷ atendimentos que já deveriam ter acontecido (não cancelados, início antes de `now`). */
  noShowRate: number | null;
  /** Minutos agendados ÷ minutos de expediente disponíveis; null sem expediente. */
  occupancyRate: number | null;
  receivedCents: number;
  commissionCents: number;
}

export function summarizeProfessionals(input: {
  professionals: { id: string; name: string }[];
  appointments: (Pick<AppointmentFact, "status" | "professionalId" | "startAt"> & { endAt: Date })[];
  payments: Pick<PaymentFact, "professionalId" | "amountCents" | "commissionPercent">[];
  /** Minutos de expediente disponíveis no período por profissional (já sem intervalos e bloqueios). */
  availableMinutes: Map<string, number>;
  now: Date;
}): ProfessionalRow[] {
  return input.professionals
    .map((professional) => {
      const own = input.appointments.filter((a) => a.professionalId === professional.id);
      const notCancelled = own.filter((a) => a.status !== "CANCELLED");
      const due = notCancelled.filter((a) => a.startAt < input.now);
      const noShows = own.filter((a) => a.status === "NO_SHOW").length;
      const booked = notCancelled.reduce((sum, a) => sum + (a.endAt.getTime() - a.startAt.getTime()) / 60_000, 0);
      const available = input.availableMinutes.get(professional.id) ?? 0;
      const paid = input.payments.filter((p) => p.professionalId === professional.id);
      return {
        id: professional.id,
        name: professional.name,
        appointments: notCancelled.length,
        completed: own.filter((a) => a.status === "COMPLETED").length,
        noShows,
        noShowRate: due.length > 0 ? noShows / due.length : null,
        occupancyRate: available > 0 ? Math.min(1, booked / available) : null,
        receivedCents: paid.reduce((sum, p) => sum + p.amountCents, 0),
        commissionCents: paid.reduce((sum, p) => sum + commissionFor(p), 0),
      };
    })
    .sort((a, b) => b.receivedCents - a.receivedCents || b.appointments - a.appointments || a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// Clientes

export interface ClientsSummary {
  /** Clientes com atendimento não cancelado no período. */
  served: number;
  /** Primeiro atendimento da vida (não cancelado) caiu no período. */
  newClients: number;
  /** Já tinham vindo antes do período. */
  returning: number;
  topSpenders: { id: string; name: string; receivedCents: number; visits: number }[];
}

export function summarizeClients(input: {
  appointments: Pick<AppointmentFact, "status" | "clientId">[];
  /** Primeira visita (não cancelada) de cada cliente, de todos os tempos. */
  firstVisitByClient: Map<string, Date>;
  periodStart: Date;
  payments: Pick<PaymentFact, "clientId" | "amountCents">[];
  clientNames: Map<string, string>;
  topLimit?: number;
}): ClientsSummary {
  const visits = new Map<string, number>();
  for (const a of input.appointments) {
    if (a.status === "CANCELLED") continue;
    visits.set(a.clientId, (visits.get(a.clientId) ?? 0) + 1);
  }
  let newClients = 0;
  for (const clientId of visits.keys()) {
    const first = input.firstVisitByClient.get(clientId);
    if (first && first >= input.periodStart) newClients += 1;
  }
  const spent = new Map<string, number>();
  for (const p of input.payments) spent.set(p.clientId, (spent.get(p.clientId) ?? 0) + p.amountCents);
  const topSpenders = [...spent]
    .filter(([, cents]) => cents > 0)
    .map(([id, receivedCents]) => ({
      id,
      name: input.clientNames.get(id) ?? "(cadastro removido)",
      receivedCents,
      visits: visits.get(id) ?? 0,
    }))
    .sort((a, b) => b.receivedCents - a.receivedCents || a.name.localeCompare(b.name))
    .slice(0, input.topLimit ?? 10);
  return { served: visits.size, newClients, returning: visits.size - newClients, topSpenders };
}

// ---------------------------------------------------------------------------
// CSV

/** "1234,56" — decimal com vírgula, sem símbolo (a planilha soma a coluna). */
export function centsToCsv(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/**
 * CSV no formato que o Excel em pt-BR abre direto: BOM UTF-8 (acentos),
 * separador ";" e aspas escapadas. Quebras de linha CRLF.
 */
export function toCsv(header: string[], rows: (string | number | null)[][]): string {
  const cell = (value: string | number | null) => {
    const text = value == null ? "" : String(value);
    return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return `﻿${[header, ...rows].map((line) => line.map(cell).join(";")).join("\r\n")}\r\n`;
}
