import { CircleCheck, CircleDollarSign } from "lucide-react";

import type { PaymentStatus } from "@/server/modules/payment/payment-rules";
import { PAYMENT_STATUS_LABELS } from "@/server/modules/payment/payment-rules";

/**
 * Pagamento no cartão da agenda, ao lado do nome do cliente (regra em
 * `agendaPaymentStatus`): pago = check; nada recebido = cifrão; parcial = selo
 * escrito "Parcial", para chamar a atenção (sinal pago num agendamento futuro
 * também). Sem status → nada.
 */
export function PaymentIndicator({ status }: { status: PaymentStatus | null }) {
  if (!status) return null;
  const label = `Pagamento: ${PAYMENT_STATUS_LABELS[status].toLowerCase()}`;
  if (status === "PARTIAL") {
    return (
      <span
        className="inline-flex shrink-0 items-center rounded-full border border-payment-partial/30 bg-payment-partial/10 px-1.5 text-caption leading-4 font-medium text-payment-partial"
        aria-label="Pagamento parcial"
        title="Pagamento parcial: ainda falta receber uma parte"
      >
        Parcial
      </span>
    );
  }
  return status === "PAID" ? (
    <CircleCheck className="size-3.5 shrink-0 text-payment-paid" aria-label={label} role="img" />
  ) : (
    <CircleDollarSign className="size-3.5 shrink-0 text-payment-pending" aria-label={label} role="img" />
  );
}
