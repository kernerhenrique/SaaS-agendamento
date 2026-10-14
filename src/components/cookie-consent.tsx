"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";

import { loadGoogleAnalytics, stopGoogleAnalytics } from "@/lib/analytics";
import { parseConsent, readStoredConsent, saveConsent, shouldAskConsent, subscribeToConsent } from "@/lib/cookie-consent";

const subscribeNoop = () => () => {};
/** No servidor (e até o navegador assumir a página) ainda não se sabe a escolha: nada aparece. */
const NOT_READY = "\u0000";

const BUTTON = "min-h-11 flex-1 rounded-full px-5 text-sm font-semibold transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:flex-none";

/**
 * Aviso de cookies do site da Aprazzo: um cartão discreto no pé da tela, com aceitar
 * e recusar lado a lado (recusar é tão fácil quanto aceitar). O Google Analytics só
 * carrega depois do aceite.
 */
export function CookieConsent() {
  const stored = useSyncExternalStore(subscribeToConsent, readStoredConsent, () => NOT_READY);
  const automated = useSyncExternalStore(subscribeNoop, () => navigator.webdriver === true, () => true);
  const choice = stored === NOT_READY ? null : parseConsent(stored);

  useEffect(() => {
    if (choice === "aceito") loadGoogleAnalytics();
    if (choice === "recusado") stopGoogleAnalytics();
  }, [choice]);

  if (stored === NOT_READY || !shouldAskConsent({ choice, automated })) return null;

  return (
    <section
      aria-label="Aviso de cookies"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-xl rounded-2xl border bg-card p-4 text-card-foreground shadow-float motion-safe:animate-pane-in sm:bottom-5 sm:flex sm:items-center sm:gap-5 sm:py-3 sm:pr-3 sm:pl-5"
    >
      <p className="text-sm text-muted-foreground">
        Podemos usar cookies para entender como o site é usado?{" "}
        <Link href="/privacidade#cookies" className="font-medium whitespace-nowrap text-foreground underline underline-offset-3">
          Saiba mais
        </Link>
      </p>
      <div className="mt-3 flex shrink-0 gap-2 sm:mt-0">
        <button type="button" onClick={() => saveConsent("recusado")} className={`${BUTTON} text-foreground ring-[1.5px] ring-input ring-inset hover:bg-muted`}>
          Recusar
        </button>
        <button type="button" onClick={() => saveConsent("aceito")} className={`${BUTTON} bg-brand-cover text-on-brand hover:bg-brand-deep`}>
          Aceitar
        </button>
      </div>
    </section>
  );
}

/** "Cookies" no rodapé e na política de privacidade: apaga a escolha e o aviso volta, para a pessoa mudar de ideia. */
export function CookiePreferencesButton({ className, children = "Cookies" }: { className?: string; children?: React.ReactNode }) {
  return (
    <button type="button" onClick={() => saveConsent(null)} className={className}>
      {children}
    </button>
  );
}
