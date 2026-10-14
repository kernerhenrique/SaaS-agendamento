"use client";

import { useEffect } from "react";

import { classifyVisitSource } from "@/lib/site-metric-rules";
import { applyCountingPreference, countOncePerTab } from "@/lib/site-metrics-client";

/** Conta a visita à página de vendas, com a origem (marcação do link ou de onde a pessoa veio). */
export function SiteVisitCounter() {
  useEffect(() => {
    applyCountingPreference(window.location.search);
    const source = classifyVisitSource({
      utmSource: new URLSearchParams(window.location.search).get("utm_source"),
      referrer: document.referrer,
      ownHost: window.location.hostname,
    });
    countOncePerTab("site_visit", source);
  }, []);
  return null;
}

/** Conta a abertura de uma demonstração (a pública ou a prévia de um prospect). */
export function DemoOpenCounter({ slug }: { slug: string }) {
  useEffect(() => {
    applyCountingPreference(window.location.search);
    countOncePerTab("demo_open", slug);
  }, [slug]);
  return null;
}
