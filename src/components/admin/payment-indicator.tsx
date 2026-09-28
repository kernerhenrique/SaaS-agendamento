import { CircleCheck, CircleDollarSign } from "lucide-react";

import type { PaymentStatus } from "@/server/modules/payment/payment-rules";
import { PAYMENT_STATUS_LABELS } from "@/server/modules/payment/payment-rules";

/**
 * Ícone pequeno de pagamento para atendimentos concluídos na agenda:
 * pago (check) ou falta receber (cifrão). Sem status → nada.
 */
export function PaymentIndicator({ status }: { status: PaymentStatus | null }) {
  if (!status) return null;
  const label = `Pagamento: ${PAYMENT_STATUS_LABELS[status].toLowerCase()}`;
  return status === "PAID" ? (
    <CircleCheck className="size-3.5 shrink-0 text-payment-paid" aria-label={label} role="img" />
  ) : (
    <CircleDollarSign className="size-3.5 shrink-0 text-payment-pending" aria-label={label} role="img" />
  );
}
