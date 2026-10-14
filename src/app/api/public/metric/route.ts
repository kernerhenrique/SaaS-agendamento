import { NextRequest, NextResponse } from "next/server";

import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { parseMetric } from "@/lib/site-metric-rules";
import { recordMetric } from "@/server/modules/metrics/metric.service";

/** Uma pessoa navegando gera poucos eventos; acima disso é abuso (o IP serve só para este limite, não é gravado). */
const METRIC_RATE_LIMIT = { limit: 60, windowMs: 5 * 60 * 1000 };

/**
 * Soma 1 num contador do site (visita, demonstração, clique no WhatsApp). Responde
 * sempre 204, com ou sem contagem: quem chama é o navegador do visitante, em
 * segundo plano, e não há nada que ele possa fazer com um erro.
 */
export async function POST(request: NextRequest) {
  const done = new NextResponse(null, { status: 204 });
  if (!checkRateLimit(`metric:${getClientIp(request.headers)}`, METRIC_RATE_LIMIT).allowed) return done;
  try {
    // `sendBeacon` manda o corpo como texto: lê e interpreta à mão.
    const metric = parseMetric(JSON.parse(await request.text()));
    if (metric) await recordMetric(metric.event, metric.label);
  } catch (error) {
    console.error("[metric] contagem não registrada", error);
  }
  return done;
}
