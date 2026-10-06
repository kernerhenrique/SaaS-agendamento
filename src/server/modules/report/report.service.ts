import { AppointmentStatus } from "@/generated/prisma/enums";
import { addDaysToIsoDate, localDayRangeUtc, utcToLocalDate } from "@/lib/date";
import { comparisonRanges, rangeLength } from "@/lib/period";
import { prisma } from "@/server/db/prisma";
import { ValidationError } from "@/server/errors";
import { availableMinutes, datesInRange, workingWindows } from "@/server/modules/dashboard/metrics";

import {
  summarizeAppointments,
  summarizeClients,
  summarizeProfessionals,
  summarizeRevenue,
  summarizeServices,
  sumByLocalDay,
  type AppointmentFact,
  type AppointmentsSummary,
  type CompletedValue,
  type ClientsSummary,
  type PaymentFact,
  type ProfessionalRow,
  type RevenueSummary,
  type ServiceRow,
} from "./report-rules";

const MAX_RANGE_DAYS = 366;

export const REPORT_SECTIONS = ["atendimentos", "faturamento", "profissionais", "servicos", "clientes"] as const;
export type ReportSection = (typeof REPORT_SECTIONS)[number];

export interface ReportRange {
  startDate: string;
  endDate: string;
  timeZone: string;
}

/**
 * Conta instantes por data de calendário local, preenchendo com zero os dias
 * sem nenhum registro — um gráfico de tendência sem os "buracos" mentiria
 * sobre o intervalo entre as colunas.
 */
export function countByLocalDay(
  instants: Date[],
  startDate: string,
  endDate: string,
  timeZone: string,
): { date: string; count: number }[] {
  const counts = new Map<string, number>();
  for (let date = startDate; date <= endDate; date = addDaysToIsoDate(date, 1)) {
    counts.set(date, 0);
  }
  for (const instant of instants) {
    const date = utcToLocalDate(instant, timeZone);
    if (counts.has(date)) counts.set(date, counts.get(date)! + 1);
  }
  return [...counts].map(([date, count]) => ({ date, count }));
}

function validateRange(startDate: string, endDate: string) {
  const days = rangeLength(startDate, endDate);
  if (Number.isNaN(days) || days < 1) throw new ValidationError("A data inicial deve ser anterior à data final");
  if (days > MAX_RANGE_DAYS) throw new ValidationError(`O período máximo é de ${MAX_RANGE_DAYS} dias`);
}

function toUtc(range: ReportRange) {
  return {
    start: localDayRangeUtc(range.startDate, range.timeZone).start,
    end: localDayRangeUtc(range.endDate, range.timeZone).end,
  };
}

/**
 * Concluídos no período (pela data do atendimento) com o valor combinado e o
 * desconto dado: base do ticket médio, igual no Financeiro e nos Relatórios.
 */
export async function loadCompletedValues(businessId: string, start: Date, end: Date): Promise<CompletedValue[]> {
  const completed = await prisma.appointment.findMany({
    where: { businessId, status: AppointmentStatus.COMPLETED, startAt: { gte: start, lt: end } },
    select: { priceCents: true, payments: { where: { deletedAt: null }, select: { discountCents: true } } },
  });
  return completed.map((a) => ({ priceCents: a.priceCents, discountCents: a.payments.reduce((sum, p) => sum + p.discountCents, 0) }));
}

/** Atendimentos (pela data do atendimento) e recebimentos (pela data de recebimento) do período. */
async function loadFacts(businessId: string, range: ReportRange) {
  const { start, end } = toUtc(range);
  const [appointments, payments] = await Promise.all([
    prisma.appointment.findMany({
      where: { businessId, startAt: { gte: start, lt: end } },
      select: { id: true, status: true, professionalId: true, serviceId: true, clientId: true, startAt: true, endAt: true },
    }),
    prisma.payment.findMany({
      where: { businessId, deletedAt: null, receivedAt: { gte: start, lt: end } },
      select: {
        appointmentId: true,
        amountCents: true,
        discountCents: true,
        method: true,
        receivedAt: true,
        commissionPercent: true,
        appointment: { select: { professionalId: true, serviceId: true, clientId: true } },
      },
    }),
  ]);
  const paymentFacts: PaymentFact[] = payments.map(({ appointment, ...p }) => ({ ...p, ...appointment }));
  return { appointments: appointments as (AppointmentFact & { endAt: Date })[], payments: paymentFacts, start, end };
}

async function professionalNames(businessId: string) {
  // Inclui removidos: o histórico continua valendo.
  const professionals = await prisma.professional.findMany({ where: { businessId }, select: { id: true, name: true } });
  return new Map(professionals.map((p) => [p.id, p.name]));
}

/**
 * Comparação "vs. período anterior": `compare` são os números do período atual
 * na janela comparada (cortada em hoje quando o período passa de hoje) e
 * `previous` os da janela anterior equivalente (`comparisonRanges`).
 */
interface Comparison<T> {
  compare: T;
  previous: T;
  comparedWith: { startDate: string; endDate: string; cut: boolean };
}
type AppointmentsCompared = Pick<AppointmentsSummary, "total" | "cancellationRate" | "noShowRate">;
type RevenueCompared = Pick<RevenueSummary, "receivedCents" | "averageTicketCents" | "discountCents">;
type ClientsCompared = Pick<ClientsSummary, "served" | "newClients" | "returning">;

export interface AppointmentsReport extends Comparison<AppointmentsCompared> {
  current: AppointmentsSummary & { byDay: { date: string; count: number }[] };
}
export interface RevenueReport extends Comparison<RevenueCompared> {
  current: RevenueSummary & { byDay: { date: string; value: number }[] };
}
export interface ProfessionalsReport {
  rows: ProfessionalRow[];
}
export interface ServicesReport {
  rows: ServiceRow[];
}
export interface ClientsReport extends Comparison<ClientsCompared> {
  current: ClientsSummary;
}
export type ReportBySection = {
  atendimentos: AppointmentsReport;
  faturamento: RevenueReport;
  profissionais: ProfessionalsReport;
  servicos: ServicesReport;
  clientes: ClientsReport;
};

/**
 * Uma seção dos Relatórios para o período (e, onde há comparação, o período
 * imediatamente anterior de mesmo tamanho). Sempre filtrado pelo businessId.
 */
export async function getReport<S extends ReportSection>(
  businessId: string,
  range: ReportRange,
  section: S,
  now = new Date(),
): Promise<ReportBySection[S]> {
  validateRange(range.startDate, range.endDate);
  const windows = comparisonRanges(range, utcToLocalDate(now, range.timeZone));
  const previous: ReportRange = { ...windows.previous, timeZone: range.timeZone };
  const compareRange: ReportRange = { ...windows.current, timeZone: range.timeZone };
  const comparedWith = { ...windows.previous, cut: windows.cut };
  // Período que passa de hoje: os números comparados param em hoje (uma leitura a mais só nesse caso).
  const loadCompareFacts = (facts: Awaited<ReturnType<typeof loadFacts>>) =>
    windows.cut ? loadFacts(businessId, compareRange) : Promise.resolve(facts);

  switch (section) {
    case "atendimentos": {
      const [facts, prevFacts, names] = await Promise.all([
        loadFacts(businessId, range),
        loadFacts(businessId, previous),
        professionalNames(businessId),
      ]);
      const current = summarizeAppointments(facts.appointments, names);
      const before = summarizeAppointments(prevFacts.appointments, names);
      const compared = summarizeAppointments((await loadCompareFacts(facts)).appointments, names);
      const report: AppointmentsReport = {
        current: {
          ...current,
          byDay: countByLocalDay(
            facts.appointments.map((a) => a.startAt),
            range.startDate,
            range.endDate,
            range.timeZone,
          ),
        },
        compare: { total: compared.total, cancellationRate: compared.cancellationRate, noShowRate: compared.noShowRate },
        previous: { total: before.total, cancellationRate: before.cancellationRate, noShowRate: before.noShowRate },
        comparedWith,
      };
      return report as ReportBySection[S];
    }

    case "faturamento": {
      const [facts, prevFacts] = await Promise.all([loadFacts(businessId, range), loadFacts(businessId, previous)]);
      const [completed, prevCompleted] = await Promise.all([
        loadCompletedValues(businessId, facts.start, facts.end),
        loadCompletedValues(businessId, prevFacts.start, prevFacts.end),
      ]);
      const before = summarizeRevenue(prevFacts.payments, prevCompleted);
      const compareFacts = await loadCompareFacts(facts);
      const compared = windows.cut
        ? summarizeRevenue(compareFacts.payments, await loadCompletedValues(businessId, compareFacts.start, compareFacts.end))
        : summarizeRevenue(facts.payments, completed);
      const report: RevenueReport = {
        current: {
          ...summarizeRevenue(facts.payments, completed),
          byDay: sumByLocalDay(
            facts.payments.map((p) => ({ at: p.receivedAt, value: p.amountCents })),
            range.startDate,
            range.endDate,
            range.timeZone,
          ),
        },
        compare: { receivedCents: compared.receivedCents, averageTicketCents: compared.averageTicketCents, discountCents: compared.discountCents },
        previous: {
          receivedCents: before.receivedCents,
          averageTicketCents: before.averageTicketCents,
          discountCents: before.discountCents,
        },
        comparedWith,
      };
      return report as ReportBySection[S];
    }

    case "servicos": {
      const [facts, services] = await Promise.all([
        loadFacts(businessId, range),
        prisma.service.findMany({ where: { businessId }, select: { id: true, name: true } }),
      ]);
      const report: ServicesReport = {
        rows: summarizeServices(facts.appointments, facts.payments, new Map(services.map((s) => [s.id, s.name]))),
      };
      return report as ReportBySection[S];
    }

    case "profissionais": {
      const facts = await loadFacts(businessId, range);
      const activeIds = new Set([
        ...facts.appointments.map((a) => a.professionalId),
        ...facts.payments.map((p) => p.professionalId),
      ]);
      // Ativos sempre; removidos/inativos só se tiveram movimento no período.
      const professionals = await prisma.professional.findMany({
        where: { businessId, OR: [{ active: true, deletedAt: null }, { id: { in: [...activeIds] } }] },
        select: { id: true, name: true, workingHours: true },
        orderBy: { name: "asc" },
      });
      const blocks = await prisma.timeBlock.findMany({
        where: {
          professionalId: { in: professionals.map((p) => p.id) },
          startAt: { lt: facts.end },
          endAt: { gt: facts.start },
        },
        select: { professionalId: true, startAt: true, endAt: true },
      });
      const dates = datesInRange(range.startDate, range.endDate);
      const minutes = new Map(
        professionals.map((p) => [
          p.id,
          availableMinutes(
            workingWindows(p.workingHours, dates, range.timeZone),
            blocks.filter((b) => b.professionalId === p.id),
          ),
        ]),
      );
      const report: ProfessionalsReport = {
        rows: summarizeProfessionals({
          professionals,
          appointments: facts.appointments,
          payments: facts.payments,
          availableMinutes: minutes,
          now,
        }),
      };
      return report as ReportBySection[S];
    }

    case "clientes": {
      const [facts, prevFacts] = await Promise.all([loadFacts(businessId, range), loadFacts(businessId, previous)]);
      const compareFacts = await loadCompareFacts(facts);
      const clientIds = [
        ...new Set([
          ...facts.appointments.map((a) => a.clientId),
          ...prevFacts.appointments.map((a) => a.clientId),
          ...facts.payments.map((p) => p.clientId),
        ]),
      ];
      const [firstVisits, clients] = await Promise.all([
        // Primeira visita de todos os tempos: define quem é "novo".
        prisma.appointment.groupBy({
          by: ["clientId"],
          where: { businessId, clientId: { in: clientIds }, status: { not: AppointmentStatus.CANCELLED } },
          _min: { startAt: true },
        }),
        prisma.client.findMany({ where: { businessId, id: { in: clientIds } }, select: { id: true, name: true } }),
      ]);
      const firstVisitByClient = new Map(
        firstVisits.filter((v) => v._min.startAt).map((v) => [v.clientId, v._min.startAt as Date]),
      );
      const clientNames = new Map(clients.map((c) => [c.id, c.name]));
      const current = summarizeClients({
        appointments: facts.appointments,
        firstVisitByClient,
        periodStart: facts.start,
        payments: facts.payments,
        clientNames,
      });
      const before = summarizeClients({
        appointments: prevFacts.appointments,
        firstVisitByClient,
        periodStart: prevFacts.start,
        payments: prevFacts.payments,
        clientNames,
      });
      const compared = windows.cut
        ? summarizeClients({
            appointments: compareFacts.appointments,
            firstVisitByClient,
            periodStart: compareFacts.start,
            payments: compareFacts.payments,
            clientNames,
          })
        : current;
      const report: ClientsReport = {
        current,
        compare: { served: compared.served, newClients: compared.newClients, returning: compared.returning },
        previous: { served: before.served, newClients: before.newClients, returning: before.returning },
        comparedWith,
      };
      return report as ReportBySection[S];
    }

    default:
      throw new ValidationError("Seção de relatório inválida");
  }
}

export interface ReportSummary {
  total: number;
  byStatus: Record<AppointmentStatus, number>;
  cancellationRate: number;
  noShowRate: number;
  mostRequestedProfessional: { professionalId: string; name: string; count: number } | null;
  byDay: { date: string; count: number }[];
  byProfessional: { professionalId: string; name: string; count: number }[];
}

/**
 * Formato antigo (tela atual e chamadas sem `secao`), agora montado sobre as
 * regras puras testadas.
 */
export async function getReportSummary(businessId: string, period: ReportRange): Promise<ReportSummary> {
  const { current } = await getReport(businessId, period, "atendimentos");
  const toLegacy = (p: { id: string; name: string; count: number }) => ({
    professionalId: p.id,
    name: p.name,
    count: p.count,
  });
  return {
    total: current.total,
    byStatus: current.byStatus,
    cancellationRate: current.cancellationRate,
    noShowRate: current.noShowRate,
    mostRequestedProfessional: current.mostRequestedProfessional ? toLegacy(current.mostRequestedProfessional) : null,
    byDay: current.byDay,
    byProfessional: current.byProfessional.map(toLegacy),
  };
}
