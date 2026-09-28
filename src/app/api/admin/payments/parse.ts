import { PaymentMethod } from "@/generated/prisma/enums";
import { ValidationError } from "@/server/errors";
import type { FinanceRange, RegisterPaymentInput } from "@/server/modules/payment/payment.service";

const METHODS = new Set<string>(Object.values(PaymentMethod));
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 366;

export function parsePaymentMethod(value: unknown): PaymentMethod | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string" || !METHODS.has(value)) throw new ValidationError("Forma de pagamento inválida");
  return value as PaymentMethod;
}

/** Corpo de um recebimento: `{ amountCents, discountCents?, method, receivedAt (ISO), note?, priceCents? }`. */
export function parsePaymentInput(body: unknown): RegisterPaymentInput {
  if (typeof body !== "object" || body === null) throw new ValidationError("Corpo da requisição inválido");
  const record = body as Record<string, unknown>;
  const method = parsePaymentMethod(record.method);
  if (!method) throw new ValidationError("Informe a forma de pagamento");
  if (typeof record.amountCents !== "number") throw new ValidationError("amountCents é obrigatório");
  if (record.discountCents !== undefined && typeof record.discountCents !== "number") {
    throw new ValidationError("discountCents deve ser número");
  }
  if (record.priceCents !== undefined && typeof record.priceCents !== "number") {
    throw new ValidationError("priceCents deve ser número");
  }
  if (typeof record.receivedAt !== "string") throw new ValidationError("receivedAt é obrigatório (ISO 8601)");
  if (record.note != null && typeof record.note !== "string") throw new ValidationError("note deve ser texto");
  return {
    amountCents: record.amountCents,
    discountCents: (record.discountCents as number | undefined) ?? 0,
    method,
    receivedAt: new Date(record.receivedAt),
    note: (record.note as string | null | undefined) ?? null,
    priceCents: record.priceCents as number | undefined,
  };
}

/** `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` (datas locais, inclusivas, até 366 dias). */
export function parseFinanceRange(params: URLSearchParams): FinanceRange {
  const startDate = params.get("startDate");
  const endDate = params.get("endDate") ?? startDate;
  if (!startDate || !endDate || !DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate)) {
    throw new ValidationError("startDate e endDate são obrigatórios (YYYY-MM-DD)");
  }
  const days = (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86_400_000;
  if (Number.isNaN(days) || days < 0) throw new ValidationError("O fim do período deve ser depois do início");
  if (days > MAX_RANGE_DAYS) throw new ValidationError(`Período máximo de ${MAX_RANGE_DAYS} dias`);
  return { startDate, endDate };
}
