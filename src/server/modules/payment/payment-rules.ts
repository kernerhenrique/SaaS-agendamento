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
  PENDING: "A receber",
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

/**
 * Selo de pagamento no cartão da agenda. Concluído: sempre (pago, parcial ou a
 * receber). Ainda por vir: só quando já entrou algum valor (sinal = parcial, pago
 * adiantado = pago). Cancelado e falta: nada, porque não há o que cobrar na agenda.
 */
export function agendaPaymentStatus(
  appointmentStatus: string,
  priceCents: number,
  payments: PaymentLike[],
): PaymentStatus | null {
  if (appointmentStatus === "CANCELLED" || appointmentStatus === "NO_SHOW") return null;
  const summary = summarizePayments(priceCents, payments);
  if (appointmentStatus === "COMPLETED") return summary.status;
  return summary.paidCents > 0 || summary.discountCents > 0 ? summary.status : null;
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

const brl = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

/**
 * O registro cabe no que falta? "Recebido agora" é só o que entrou neste
 * momento (não o total já pago): recebido + desconto não pode passar do saldo.
 * Pagamento a mais não vira gorjeta: ajusta-se o valor do atendimento. Também
 * recusa baixar o valor do atendimento para menos do que já foi recebido/descontado.
 */
export function checkPaymentFits(
  current: { priceCents: number; paidCents: number; discountCents: number },
  input: { amountCents: number; discountCents: number; priceCents?: number },
): string | null {
  const priceCents = input.priceCents ?? current.priceCents;
  const alreadyCovered = current.paidCents + current.discountCents;
  if (priceCents < alreadyCovered) {
    return `O valor do atendimento não pode ficar menor que o já recebido e descontado (${brl(alreadyCovered)}). Remova o recebimento errado antes.`;
  }
  const remaining = priceCents - alreadyCovered;
  if (remaining === 0 && input.amountCents + input.discountCents > 0) {
    return "Este atendimento já está quitado. Se o cliente pagou a mais, ajuste o valor do atendimento.";
  }
  if (input.discountCents > remaining) {
    return `O desconto não pode passar do que falta (${brl(remaining)}).`;
  }
  // O desconto deste registro já reduz o que falta: R$ 35 com R$ 10 de desconto = faltam R$ 25.
  const dueAfterDiscount = remaining - input.discountCents;
  if (input.amountCents > dueAfterDiscount) {
    const due = input.discountCents > 0 ? `Com o desconto, faltam só ${brl(dueAfterDiscount)}` : `Faltam só ${brl(dueAfterDiscount)}`;
    return `${due}. Informe só o que o cliente pagou agora (não o total). Se ele pagou a mais, ajuste o valor do atendimento.`;
  }
  return null;
}

/**
 * Quem pode remover um recebimento: o dono, sempre; quem lançou, no mesmo
 * dia (corrigir um erro na hora, sem depender do dono). `day` = data local
 * do negócio (YYYY-MM-DD) do registro e de hoje.
 */
export function canRemovePayment(
  viewer: { isOwner: boolean; userId: string },
  payment: { createdByUserId: string | null; createdDay: string },
  today: string,
): boolean {
  if (viewer.isOwner) return true;
  return payment.createdByUserId === viewer.userId && payment.createdDay === today;
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
