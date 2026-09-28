import type { StatusTone } from "@/components/status-badge";
import type { PaymentStatus } from "@/server/modules/payment/payment-rules";

/** Tom do `StatusBadge` (tokens --payment-*) para cada situação de pagamento. */
export const PAYMENT_STATUS_TONE: Record<PaymentStatus, StatusTone> = {
  PENDING: "pending",
  PARTIAL: "partial",
  PAID: "paid",
};
