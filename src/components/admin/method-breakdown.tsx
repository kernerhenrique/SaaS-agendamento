import type { PaymentMethod } from "@/generated/prisma/enums";
import { formatPriceFromCents } from "@/lib/currency";
import { PAYMENT_METHOD_LABELS } from "@/server/modules/payment/payment-rules";

/**
 * Barras "Por forma de pagamento" (proporção do recebido no período) — usado
 * no Financeiro e no relatório de Faturamento.
 */
export function MethodBreakdown({
  byMethod,
}: {
  byMethod: { method: PaymentMethod; amountCents: number; count: number }[];
}) {
  if (byMethod.length === 0) return null;
  const max = Math.max(...byMethod.map((m) => m.amountCents));
  return (
    <section className="rounded-lg border bg-card p-4" aria-labelledby="by-method-title">
      <h2 id="by-method-title" className="mb-3 text-sm font-semibold">
        Por forma de pagamento
      </h2>
      <ul className="flex flex-col gap-2">
        {byMethod.map((row) => (
          <li
            key={row.method}
            className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[6.5rem_1fr_auto]"
          >
            <span>{PAYMENT_METHOD_LABELS[row.method]}</span>
            <span className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
              {/* Largura proporcional ao maior valor: dado dinâmico, por isso style. */}
              <span className="block h-full rounded-full bg-primary" style={{ width: `${(row.amountCents / max) * 100}%` }} />
            </span>
            <span className="text-right tabular-nums">
              {formatPriceFromCents(row.amountCents)}{" "}
              {/* No celular a contagem sai para a barra ter espaço. */}
              <span className="hidden text-caption text-muted-foreground sm:inline">
                ({row.count} {row.count === 1 ? "recebimento" : "recebimentos"})
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
