"use client";

import { useEffect, useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAdminAccess } from "@/components/admin/admin-access-context";
import { PaymentForm } from "@/components/admin/payment-form";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { AppointmentStatus, PaymentMethod } from "@/generated/prisma/enums";
import { formatPriceFromCents } from "@/lib/currency";
import { PAYMENT_STATUS_TONE } from "@/lib/payment-status";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  type PaymentSummary,
} from "@/server/modules/payment/payment-rules";

interface PaymentItem {
  id: string;
  amountCents: number;
  discountCents: number;
  method: PaymentMethod;
  receivedAt: string;
  note: string | null;
  /** Quem registrou (null = registro antigo, de antes do controle por usuário). */
  createdByName: string | null;
}

/**
 * Seção "Pagamento" do drawer do agendamento: situação, recebimentos e o
 * formulário de registro. O "Concluir e receber" do rodapé usa o mesmo
 * formulário (`completing`).
 */
export function AppointmentPayments({
  appointmentId,
  status,
  timezone,
  reloadKey,
  completing,
  onCompletingChange,
  onChanged,
}: {
  appointmentId: string;
  status: AppointmentStatus;
  timezone: string;
  /** Muda quando o drawer recarrega (ex.: status alterado). */
  reloadKey: number;
  completing: boolean;
  onCompletingChange: (completing: boolean) => void;
  onChanged: () => void;
}) {
  const canDelete = useAdminAccess().can("payment.delete");
  const [data, setData] = useState<{ payments: PaymentItem[]; summary: PaymentSummary } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [localReload, setLocalReload] = useState(0);
  const [registering, setRegistering] = useState(false);
  const [removing, setRemoving] = useState<PaymentItem | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/appointments/${appointmentId}/payments`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
          setLoadError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [appointmentId, reloadKey, localReload]);

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, dateStyle: "short" }).format(new Date(iso));

  async function confirmRemove() {
    if (!removing) return;
    setIsRemoving(true);
    try {
      const response = await fetch(`/api/admin/payments/${removing.id}`, { method: "DELETE" });
      if (!response.ok) {
        toast.error("Não foi possível remover o recebimento");
        return;
      }
      toast.success("Recebimento removido.");
      setRemoving(null);
      setLocalReload((k) => k + 1);
      onChanged();
    } finally {
      setIsRemoving(false);
    }
  }

  if (loadError) {
    return (
      <section className="flex items-center gap-2 text-sm text-destructive">
        Não foi possível carregar os pagamentos.
        <Button size="sm" variant="ghost" onClick={() => setLocalReload((k) => k + 1)}>
          <RotateCcw />
          Tentar de novo
        </Button>
      </section>
    );
  }
  if (!data) return <Skeleton className="h-20 w-full" aria-label="Carregando pagamentos" />;

  const { summary, payments } = data;
  const showForm = completing || registering;
  // Cancelado não deve nada: sem "falta receber" nem "Registrar pagamento".
  // Se já tinha entrado um sinal, mostra só o que foi recebido.
  const isCancelled = status === "CANCELLED";
  if (isCancelled && payments.length === 0) return null;

  return (
    <section className="flex flex-col gap-2" aria-labelledby="payments-title">
      <div className="flex items-center justify-between gap-2">
        <h3 id="payments-title" className="text-caption font-medium text-muted-foreground uppercase">
          Pagamento
        </h3>
        {isCancelled ? null : (
          <StatusBadge tone={PAYMENT_STATUS_TONE[summary.status]}>{PAYMENT_STATUS_LABELS[summary.status]}</StatusBadge>
        )}
      </div>

      {isCancelled ? (
        <p className="text-sm text-muted-foreground">
          Recebido antes do cancelamento: <span className="font-medium text-foreground">{formatPriceFromCents(summary.paidCents)}</span>.
          Se devolver ao cliente, remova o recebimento.
        </p>
      ) : (
        <dl className="grid grid-cols-3 gap-2 text-center">
          <Amount label="Valor" cents={summary.priceCents} />
          <Amount label="Recebido" cents={summary.paidCents} />
          <Amount label="Falta" cents={summary.balanceCents} highlight={summary.balanceCents > 0} />
        </dl>
      )}

      {payments.length > 0 ? (
        <ul className="flex flex-col gap-1.5" aria-label="Recebimentos">
          {payments.map((payment) => (
            <li key={payment.id} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1">
                {payment.amountCents > 0 ? (
                  <>
                    <span className="font-medium tabular-nums">{formatPriceFromCents(payment.amountCents)}</span>
                    {" · "}
                    {PAYMENT_METHOD_LABELS[payment.method]} · {formatDate(payment.receivedAt)}
                    {payment.discountCents > 0 ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · desconto {formatPriceFromCents(payment.discountCents)}
                      </span>
                    ) : null}
                  </>
                ) : (
                  // Só desconto (sem dinheiro entrando): a forma de pagamento não se aplica.
                  <>
                    Desconto de <span className="font-medium tabular-nums">{formatPriceFromCents(payment.discountCents)}</span>
                    {" · "}
                    {formatDate(payment.receivedAt)}
                  </>
                )}
                {payment.note ? <span className="block truncate text-caption text-muted-foreground">{payment.note}</span> : null}
                {payment.createdByName ? (
                  <span className="block truncate text-caption text-muted-foreground">Registrado por {payment.createdByName}</span>
                ) : null}
              </span>
              {canDelete ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={
                    payment.amountCents > 0
                      ? `Remover recebimento de ${formatPriceFromCents(payment.amountCents)}`
                      : `Remover desconto de ${formatPriceFromCents(payment.discountCents)}`
                  }
                  onClick={() => setRemoving(payment)}
                >
                  <Trash2 />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {showForm ? (
        <PaymentForm
          key={completing ? "complete" : "register"}
          appointmentId={appointmentId}
          timezone={timezone}
          summary={summary}
          mode={completing ? "complete" : "register"}
          onDone={() => {
            setRegistering(false);
            onCompletingChange(false);
            setLocalReload((k) => k + 1);
            onChanged();
          }}
          onCancel={() => {
            setRegistering(false);
            onCompletingChange(false);
          }}
        />
      ) : summary.status !== "PAID" && !isCancelled ? (
        <Button variant="outline" size="sm" className="w-fit" onClick={() => setRegistering(true)}>
          <Plus />
          Registrar pagamento
        </Button>
      ) : null}

      <Dialog open={removing != null} onOpenChange={(open) => !open && setRemoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover recebimento?</DialogTitle>
            <DialogDescription>
              {removing
                ? `${
                    removing.amountCents > 0
                      ? `${formatPriceFromCents(removing.amountCents)} no ${PAYMENT_METHOD_LABELS[removing.method]}`
                      : `Desconto de ${formatPriceFromCents(removing.discountCents)}`
                  } em ${formatDate(removing.receivedAt)}. Use para corrigir um lançamento feito por engano.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoving(null)}>
              Voltar
            </Button>
            <Button variant="destructive" disabled={isRemoving} onClick={() => void confirmRemove()}>
              {isRemoving ? "Removendo…" : "Remover recebimento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Amount({ label, cents, highlight }: { label: string; cents: number; highlight?: boolean }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-2">
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className={highlight ? "text-sm font-semibold text-payment-pending tabular-nums" : "text-sm font-semibold tabular-nums"}>
        {formatPriceFromCents(cents)}
      </dd>
    </div>
  );
}
