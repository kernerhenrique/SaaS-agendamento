/**
 * Medição própria do site (sem cookies e sem terceiros): contadores anônimos por
 * dia de visitas, aberturas da demonstração e cliques no WhatsApp. Aqui ficam as
 * regras puras, usadas no navegador e no servidor.
 */

/** De onde a visita veio. */
export const VISIT_SOURCES = ["instagram", "linkedin", "whatsapp", "facebook", "google", "direto", "outro"] as const;
export type VisitSource = (typeof VISIT_SOURCES)[number];

/**
 * Botões de WhatsApp: os da página de vendas (`section` em `landing-links.tsx`) e os das
 * demonstrações (`demo-pagina` na faixa da página de reservas, `demo-painel` no painel).
 */
export const WHATSAPP_SECTIONS = [
  "header", "hero", "demo", "solo", "como-comecar", "final", "footer", "sticky-mobile", "demo-pagina", "demo-painel",
] as const;

/**
 * Eventos contados e o que vale como detalhe de cada um:
 * - `site_visit`: a origem (`VisitSource`);
 * - `whatsapp_click`: o botão (`WHATSAPP_SECTIONS`);
 * - `demo_open` e `demo_panel`: o endereço da demonstração (conferido no banco).
 */
export const METRIC_EVENTS = ["site_visit", "whatsapp_click", "demo_open", "demo_panel"] as const;
export type MetricEvent = (typeof METRIC_EVENTS)[number];

export const DEMO_METRIC_EVENTS: readonly MetricEvent[] = ["demo_open", "demo_panel"];

const SLUG_PATTERN = /^[a-z0-9-]{3,60}$/;

/** Confere evento e detalhe vindos do navegador; `null` = descartar em silêncio. */
export function parseMetric(input: unknown): { event: MetricEvent; label: string } | null {
  const record = input as { event?: unknown; label?: unknown } | null;
  const event = record?.event;
  const label = typeof record?.label === "string" ? record.label.trim().toLowerCase() : "";
  if (typeof event !== "string" || !(METRIC_EVENTS as readonly string[]).includes(event)) return null;
  const allowed =
    event === "site_visit"
      ? (VISIT_SOURCES as readonly string[]).includes(label)
      : event === "whatsapp_click"
        ? (WHATSAPP_SECTIONS as readonly string[]).includes(label)
        : SLUG_PATTERN.test(label);
  return allowed ? { event: event as MetricEvent, label } : null;
}

const SOURCE_HINTS: [VisitSource, RegExp][] = [
  ["instagram", /instagram|(^|\.)ig\.me$/],
  ["linkedin", /linkedin|lnkd\.in/],
  ["whatsapp", /whatsapp|wa\.me/],
  ["facebook", /facebook|fb\.(com|me)|(^|\.)fb$|^meta$/],
  ["google", /google/],
];

/**
 * Origem da visita: a marcação do link (`?utm_source=instagram`) vale mais que o
 * endereço de quem mandou o visitante, que os aplicativos costumam esconder. Sem
 * nenhum dos dois, ou vindo do próprio site, é "direto".
 */
export function classifyVisitSource({ utmSource, referrer, ownHost }: { utmSource?: string | null; referrer?: string | null; ownHost: string }): VisitSource {
  const tagged = utmSource?.trim().toLowerCase();
  if (tagged) return SOURCE_HINTS.find(([, pattern]) => pattern.test(tagged))?.[0] ?? "outro";
  if (!referrer) return "direto";
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return "direto";
  }
  if (host === ownHost.toLowerCase()) return "direto";
  return SOURCE_HINTS.find(([, pattern]) => pattern.test(host))?.[0] ?? "outro";
}

/**
 * Conta esta visita? Não, quando o navegador é controlado por automação (testes,
 * robôs) ou quando a pessoa pediu para ficar de fora (o dono, com `?contar=nao`).
 */
export function shouldCountVisitor({ automated, optedOut }: { automated: boolean; optedOut: boolean }): boolean {
  return !automated && !optedOut;
}

/** Rótulos para o relatório (`npm run metricas`). */
export const METRIC_EVENT_LABELS: Record<MetricEvent, string> = {
  site_visit: "Visitas ao site",
  whatsapp_click: "Cliques no WhatsApp",
  demo_open: "Aberturas da demonstração",
  demo_panel: "Entradas no painel da demonstração",
};
