import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Tons de status do domínio (agendamento e pagamento), mapeados nos tokens
 * --status-* / --payment-* de globals.css. Ver docs/design-system.md.
 */
export type StatusTone =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no-show"
  | "pending"
  | "partial"
  | "paid";

const TONE_CLASSES: Record<StatusTone, string> = {
  scheduled: "border-status-scheduled/30 bg-status-scheduled/10 text-status-scheduled",
  confirmed: "border-status-confirmed/30 bg-status-confirmed/10 text-status-confirmed",
  completed: "border-status-completed/30 bg-status-completed/10 text-status-completed",
  cancelled: "border-status-cancelled/30 bg-status-cancelled/10 text-status-cancelled",
  "no-show": "border-status-no-show/30 bg-status-no-show/10 text-status-no-show",
  pending: "border-payment-pending/30 bg-payment-pending/10 text-payment-pending",
  partial: "border-payment-partial/30 bg-payment-partial/10 text-payment-partial",
  paid: "border-payment-paid/30 bg-payment-paid/10 text-payment-paid",
};

export function StatusBadge({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return (
    <Badge variant="outline" className={cn(TONE_CLASSES[tone])}>
      {children}
    </Badge>
  );
}
