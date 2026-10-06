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

/**
 * Campo de dinheiro: o cursor precisa ir para o fim? Sim, sempre que não
 * estiver lá — exceto quando o texto inteiro está selecionado (digitar substitui tudo).
 */
export function caretNeedsMove(start: number | null, end: number | null, length: number): boolean {
  if (start == null || end == null) return false;
  if (start === 0 && end === length && length > 0) return false;
  return start !== length || end !== length;
}
