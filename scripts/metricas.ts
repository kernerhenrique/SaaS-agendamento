/**
 * Mostra a medição própria do site: visitas (por origem), aberturas da demonstração
 * e cliques no WhatsApp (por botão), dia a dia.
 *
 *   npm run metricas -- --producao          últimos 7 dias em aprazzo.com.br
 *   npm run metricas -- 30 --producao       últimos 30 dias
 *   npm run metricas                        banco local
 *
 * São contadores anônimos (sem cookies): contam visitas, não pessoas. Para o seu
 * navegador ficar de fora, abra uma vez aprazzo.com.br/?contar=nao.
 * Ambiente e trava de banco errado: scripts/lib/script-env.ts.
 */
import { fail, loadScriptEnvironment } from "./lib/script-env";

const MAX_DAYS = 366;
const shortDay = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

async function main() {
  const args = process.argv.slice(2);
  const production = args.includes("--producao");
  const unknown = args.find((arg) => arg.startsWith("--") && arg !== "--producao");
  if (unknown) fail(`Opção desconhecida: ${unknown}`);
  const [daysArg] = args.filter((arg) => !arg.startsWith("--"));
  const days = daysArg === undefined ? 7 : Number(daysArg);
  if (!Number.isInteger(days) || days < 1 || days > MAX_DAYS) fail(`Informe quantos dias mostrar (1 a ${MAX_DAYS}): npm run metricas -- 30 --producao`);

  loadScriptEnvironment(production);
  const { METRIC_EVENTS, METRIC_EVENT_LABELS } = await import("@/lib/site-metric-rules");
  const { readMetrics } = await import("@/server/modules/metrics/metric.service");
  const { prisma } = await import("@/server/db/prisma");
  try {
    const { since, until, rows } = await readMetrics(days);
    console.log(`\nMedição do site ${production ? "(produção)" : "(banco local)"} · ${shortDay(since)} a ${shortDay(until)}\n`);
    if (rows.length === 0) return console.log("Nenhum registro no período.\n");

    for (const event of METRIC_EVENTS) {
      const ofEvent = rows.filter((row) => row.event === event);
      const total = ofEvent.reduce((sum, row) => sum + row.count, 0);
      console.log(`${METRIC_EVENT_LABELS[event]}: ${total}`);
      const byLabel = new Map<string, number>();
      for (const row of ofEvent) byLabel.set(row.label, (byLabel.get(row.label) ?? 0) + row.count);
      for (const [label, count] of [...byLabel].sort((a, b) => b[1] - a[1])) console.log(`   ${String(count).padStart(5)}  ${label}`);
      console.log("");
    }

    console.log("Por dia          visitas   demo   painel   WhatsApp");
    const daysWithData = [...new Set(rows.map((row) => row.day))];
    for (const day of daysWithData) {
      const sum = (event: string) => rows.filter((row) => row.day === day && row.event === event).reduce((total, row) => total + row.count, 0);
      console.log(`  ${shortDay(day)}${String(sum("site_visit")).padStart(17)}${String(sum("demo_open")).padStart(7)}${String(sum("demo_panel")).padStart(9)}${String(sum("whatsapp_click")).padStart(11)}`);
    }
    console.log("");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
