/**
 * Passos da reserva pública: 1 serviço · 2 profissional · 3 horário · 4 contato.
 * Cada avanço vira uma entrada no histórico do navegador, para o "voltar" do
 * aparelho voltar um passo em vez de sair da página.
 */

/** Chave do passo dentro de `history.state`. */
export const BOOKING_STEP_STATE_KEY = "bookingStep";

/** O passo guardado numa entrada do histórico (1 quando a entrada não é da reserva). */
export function stepFromHistoryState(state: unknown): number {
  const step = (state as Record<string, unknown> | null)?.[BOOKING_STEP_STATE_KEY];
  return typeof step === "number" && step >= 1 && step <= 4 ? step : 1;
}

/**
 * O passo mais adiantado que as escolhas feitas sustentam, até o pedido. O histórico
 * pode pedir um passo sem o que ele precisa (página recarregada no meio, "avançar"
 * depois de trocar o serviço): em vez de uma tela vazia, mostra o passo anterior.
 */
export function reachableStep(requested: number, chosen: { service: boolean; professional: boolean; slot: boolean }): number {
  if (requested >= 4 && chosen.service && chosen.professional && chosen.slot) return 4;
  if (requested >= 3 && chosen.service && chosen.professional) return 3;
  if (requested >= 2 && chosen.service) return 2;
  return 1;
}

const CONFIRMED_KEY_PREFIX = "reserva-confirmada:";

/** A reserva recém-confirmada fica guardada na aba: recarregar a página não pode esconder o link do cliente. */
export function saveConfirmedBooking(businessId: string, confirmed: { startAt: string }): void {
  try {
    window.sessionStorage.setItem(CONFIRMED_KEY_PREFIX + businessId, JSON.stringify(confirmed));
  } catch {
    // sessionStorage pode estar indisponível (modo privado, storage bloqueado): a confirmação continua na tela.
  }
}

export function clearConfirmedBooking(businessId: string): void {
  try {
    window.sessionStorage.removeItem(CONFIRMED_KEY_PREFIX + businessId);
  } catch {
    // idem
  }
}

/**
 * O que foi guardado (JSON), só quando a página foi RECARREGADA (ou restaurada pelo
 * navegador) e o horário ainda não passou. Quem abre o link de novo começa do zero.
 */
export function readConfirmedBookingOnReload(businessId: string): string | null {
  try {
    const [navigation] = window.performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    if (navigation?.type !== "reload" && navigation?.type !== "back_forward") return null;
    const stored = window.sessionStorage.getItem(CONFIRMED_KEY_PREFIX + businessId);
    if (!stored) return null;
    const startAt = new Date((JSON.parse(stored) as { startAt?: string }).startAt ?? "");
    return startAt.getTime() > Date.now() ? stored : null;
  } catch {
    return null;
  }
}
