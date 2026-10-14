import { shouldCountVisitor, type MetricEvent } from "@/lib/site-metric-rules";

/** Quem não quer entrar na contagem (o dono abrindo o próprio site) fica marcado neste navegador. */
const OPT_OUT_KEY = "aprazzo:nao-contar";
const COUNTED_PREFIX = "aprazzo:contado:";

function read(storage: "localStorage" | "sessionStorage", key: string): string | null {
  try {
    return window[storage].getItem(key);
  } catch {
    return null; // modo privado ou armazenamento bloqueado
  }
}

function write(storage: "localStorage" | "sessionStorage", key: string, value: string | null): void {
  try {
    if (value === null) window[storage].removeItem(key);
    else window[storage].setItem(key, value);
  } catch {
    // idem: a contagem segue sem a marca
  }
}

/** `?contar=nao` tira este navegador da contagem; `?contar=sim` devolve. */
export function applyCountingPreference(search: string): void {
  const choice = new URLSearchParams(search).get("contar");
  if (choice === "nao") write("localStorage", OPT_OUT_KEY, "1");
  if (choice === "sim") write("localStorage", OPT_OUT_KEY, null);
}

/** Soma 1 no contador do site, em segundo plano (não atrasa o clique nem a navegação). */
export function countEvent(event: MetricEvent, label: string): void {
  if (typeof window === "undefined") return;
  if (!shouldCountVisitor({ automated: navigator.webdriver === true, optedOut: read("localStorage", OPT_OUT_KEY) === "1" })) return;
  const body = JSON.stringify({ event, label });
  try {
    if (navigator.sendBeacon?.("/api/public/metric", body)) return;
  } catch {
    // cai no fetch abaixo
  }
  void fetch("/api/public/metric", { method: "POST", body, keepalive: true }).catch(() => {});
}

/** Uma vez por aba: recarregar a página não conta outra visita. */
export function countOncePerTab(event: MetricEvent, label: string): void {
  if (typeof window === "undefined") return;
  const key = `${COUNTED_PREFIX}${event}:${event === "site_visit" ? "" : label}`;
  if (read("sessionStorage", key)) return;
  write("sessionStorage", key, "1");
  countEvent(event, label);
}
