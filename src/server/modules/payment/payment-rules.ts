import type { PaymentMethod } from "@/generated/prisma/enums";

/**
 * Regras puras do financeiro (sem banco) — testadas em
 * tests/unit/payment-rules.spec.ts. O SaaS não processa pagamento: só
 * registra o que o cliente pagou fora (PIX, dinheiro, maquininha).
 *
 * Vocabulário:
 * - valor do atendimento (`priceCents`): gravado na marcação, ajustável ao receber;
 * - recebido (`amountCents`): dinheiro que entrou de fato;
 * - desconto (`discountCents`): abatimento concedido, reduz o que falta pagar.
 */

export type PaymentStatus = "PENDING" | "PARTIAL" | "PAID";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pendente",
  PARTIAL: "Parcial",
  PAID: "Pago",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  PIX: "PIX",
  CASH: "Dinheiro",
  DEBIT_CARD: "Débito",
  CREDIT_CARD: "Crédito",
  BANK_TRANSFER: "Transferência",
  OTHER: "Outro",
};

export interface PaymentLike {
  amountCents: number;
  discountCents: number;
}

export interface PaymentSummary {
  priceCents: number;
  paidCents: number;
  discountCents: number;
  /** Quanto ainda falta: valor − descontos − recebido (nunca negativo). */
  balanceCents: number;
  status: PaymentStatus;
}

/** Situação de um atendimento a partir dos pagamentos não removidos. */
export function summarizePayments(priceCents: number, payments: PaymentLike[]): PaymentSummary {
  const paidCents = payments.reduce((sum, p) => sum + p.amountCents, 0);
  const discountCents = payments.reduce((sum, p) => sum + p.discountCents, 0);
  const dueCents = Math.max(0, priceCents - discountCents);
  const balanceCents = Math.max(0, dueCents - paidCents);
  const status: PaymentStatus =
    balanceCents === 0 && (paidCents > 0 || discountCents > 0 || priceCents === 0)
      ? "PAID"
      : paidCents > 0 || discountCents > 0
        ? "PARTIAL"
        : "PENDING";
  return { priceCents, paidCents, discountCents, balanceCents, status };
}

/** Comissão de um pagamento: % congelada sobre o valor recebido, arredondada ao centavo. */
export function commissionFor(payment: { amountCents: number; commissionPercent: number | null }): number {
  if (!payment.commissionPercent) return 0;
  return Math.round((payment.amountCents * payment.commissionPercent) / 100);
}

export interface PaymentInput {
  amountCents: number;
  discountCents: number;
  receivedAt: Date;
}

/**
 * Validação de um recebimento. Devolve a mensagem de erro ou null.
 * `now`: a data de recebimento pode ser hoje ou passada, nunca futura
 * (aceita até o fim do dia corrente — `endOfToday`).
 */
export function validatePaymentInput(input: PaymentInput, endOfToday: Date): string | null {
  const isCents = (value: number) => Number.isInteger(value) && value >= 0;
  if (!isCents(input.amountCents) || !isCents(input.discountCents)) {
    return "Valores devem ser em centavos, inteiros e não negativos";
  }
  if (input.amountCents === 0 && input.discountCents === 0) {
    return "Informe o valor recebido ou um desconto";
  }
  if (Number.isNaN(input.receivedAt.getTime())) return "Data de recebimento inválida";
  if (input.receivedAt >= endOfToday) return "A data de recebimento não pode ser no futuro";
  return null;
}

export function validatePriceCents(priceCents: number): string | null {
  return Number.isInteger(priceCents) && priceCents >= 0
    ? null
    : "O valor do atendimento deve ser em centavos, inteiro e não negativo";
}

export function validateCommissionPercent(value: number | null): string | null {
  if (value == null) return null;
  return Number.isInteger(value) && value >= 0 && value <= 100
    ? null
    : "A comissão deve ser um número inteiro de 0 a 100";
}
