/**
 * Consentimento de cookies de medição (LGPD). Vale só no site da Aprazzo (página de
 * vendas, demonstrações, termos e privacidade): as páginas de reserva dos negócios e
 * o painel não têm cookies de medição. A escolha fica no navegador da pessoa.
 */

export type ConsentChoice = "aceito" | "recusado";

export const CONSENT_STORAGE_KEY = "aprazzo:cookies";
/** Evento da janela disparado quando a escolha muda (o aviso e o carregador escutam). */
const CONSENT_EVENT = "aprazzo:cookies";

export function parseConsent(stored: string | null | undefined): ConsentChoice | null {
  return stored === "aceito" || stored === "recusado" ? stored : null;
}

/**
 * Mostra o aviso? Só para quem ainda não escolheu. Navegador controlado por
 * automação (testes, robôs) não é perguntado: não há ninguém para responder.
 */
export function shouldAskConsent({ choice, automated }: { choice: ConsentChoice | null; automated: boolean }): boolean {
  return choice === null && !automated;
}

/** A medição de terceiros só roda no endereço de produção: em computador local e prévias, nunca. */
export function analyticsAllowedOnHost(host: string, allowedHosts: readonly string[]): boolean {
  return allowedHosts.includes(host.toLowerCase());
}

// --- No navegador ---

export function readStoredConsent(): string | null {
  try {
    return window.localStorage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    return null; // modo privado ou armazenamento bloqueado: pergunta de novo a cada visita
  }
}

/** Grava a escolha (`null` apaga, e o aviso volta a aparecer) e avisa quem estiver escutando. */
export function saveConsent(choice: ConsentChoice | null): void {
  try {
    if (choice === null) window.localStorage.removeItem(CONSENT_STORAGE_KEY);
    else window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    // sem armazenamento, a escolha vale só enquanto a página estiver aberta
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: choice }));
}

export function subscribeToConsent(onChange: () => void): () => void {
  window.addEventListener(CONSENT_EVENT, onChange);
  window.addEventListener("storage", onChange); // outra aba mudou a escolha
  return () => {
    window.removeEventListener(CONSENT_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
