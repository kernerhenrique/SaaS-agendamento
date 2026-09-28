export function formatPriceFromCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Centavos → texto do campo de valor, sem "R$": 123456 → "1.234,56". */
export function formatCentsInput(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Texto digitado → centavos, no estilo "caixa registradora": só os dígitos
 * contam e os dois últimos são os centavos ("1234" → 1234 = R$ 12,34).
 * Limita a 9 dígitos (R$ 9.999.999,99) para nunca estourar.
 */
export function digitsToCents(text: string): number {
  const digits = text.replace(/\D/g, "").slice(-9);
  return digits ? Number(digits) : 0;
}
