import { ANALYTICS } from "@/config/brand";
import { analyticsAllowedOnHost } from "@/lib/cookie-consent";

/**
 * Google Analytics do site da Aprazzo. Só é carregado depois do "Aceitar" no aviso de
 * cookies (`components/cookie-consent.tsx`) e só no endereço de produção. A contagem
 * própria e anônima (`lib/site-metric-rules.ts`) continua valendo para todo mundo.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const disableFlag = (id: string) => `ga-disable-${id}`;

/** Carrega o Google Analytics (uma vez). Não faz nada fora de produção ou sem ID configurado. */
export function loadGoogleAnalytics(): void {
  const id = ANALYTICS.gaMeasurementId;
  if (!id || !analyticsAllowedOnHost(window.location.hostname, ANALYTICS.hosts)) return;
  (window as unknown as Record<string, boolean>)[disableFlag(id)] = false;
  if (window.gtag) return;

  window.dataLayer = window.dataLayer ?? [];
  // O gtag.js só entende o objeto `arguments` na fila (um array comum é ignorado).
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", id);
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(script);
}

/** A pessoa recusou (ou mudou de ideia): para de enviar e apaga os cookies do Google Analytics. */
export function stopGoogleAnalytics(): void {
  const id = ANALYTICS.gaMeasurementId;
  if (!id) return;
  (window as unknown as Record<string, boolean>)[disableFlag(id)] = true;
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0].trim();
    if (!name.startsWith("_ga")) continue;
    for (const domain of ["", `; domain=.${window.location.hostname.replace(/^www\./, "")}`]) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
    }
  }
}

/** Evento do site para o Google Analytics; sem ele carregado (sem aceite), não faz nada. */
export function sendAnalyticsEvent(event: string, params: Record<string, string> = {}): void {
  if (typeof window !== "undefined" && typeof window.gtag === "function") window.gtag("event", event, params);
}
