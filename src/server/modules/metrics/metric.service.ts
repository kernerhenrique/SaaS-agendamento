import { addDaysToIsoDate, todayInTimeZone } from "@/lib/date";
import { DEMO_METRIC_EVENTS, type MetricEvent } from "@/lib/site-metric-rules";
import { prisma } from "@/server/db/prisma";

/** O dia vira na meia-noite de Brasília, que é onde a Aprazzo vende. */
const METRICS_TIME_ZONE = "America/Sao_Paulo";

/**
 * Soma 1 no contador do dia. Eventos da demonstração só contam para um endereço
 * que seja mesmo uma demonstração: evita linhas com endereços inventados.
 */
export async function recordMetric(event: MetricEvent, label: string): Promise<boolean> {
  if (DEMO_METRIC_EVENTS.includes(event)) {
    const demo = await prisma.business.findFirst({ where: { slug: label, isDemo: true, deletedAt: null }, select: { id: true } });
    if (!demo) return false;
  }
  const day = todayInTimeZone(METRICS_TIME_ZONE);
  await prisma.siteMetric.upsert({
    where: { day_event_label: { day, event, label } },
    create: { day, event, label, count: 1 },
    update: { count: { increment: 1 } },
  });
  return true;
}

export interface MetricRow {
  day: string;
  event: string;
  label: string;
  count: number;
}

/** Contadores dos últimos `days` dias (hoje incluído), do mais recente ao mais antigo. */
export async function readMetrics(days: number): Promise<{ since: string; until: string; rows: MetricRow[] }> {
  const until = todayInTimeZone(METRICS_TIME_ZONE);
  const since = addDaysToIsoDate(until, -(days - 1));
  const rows = await prisma.siteMetric.findMany({
    where: { day: { gte: since, lte: until } },
    select: { day: true, event: true, label: true, count: true },
    orderBy: [{ day: "desc" }, { event: "asc" }, { count: "desc" }],
  });
  return { since, until, rows };
}
