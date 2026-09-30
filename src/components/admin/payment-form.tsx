"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { MoneyInput } from "@/components/money-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaymentMethod } from "@/generated/prisma/enums";
import { formatPriceFromCents } from "@/lib/currency";
import { localMinutesToUtc, todayInTimeZone } from "@/lib/date";
import { PAYMENT_METHOD_LABELS, summarizePayments } from "@/server/modules/payment/payment-rules";
import { cn } from "cn";

import { useAdminAccess } from "./admin-access-context";

export interface PaymentFormSummary {
  priceCents: number;
  paidCents: number;
  discountCents: number;
  balanceCents: number;
}

const METHODS = Object.values(PaymentMethod);

/**
 * Registrar um recebimento (valor, desconto, forma, data, observação), com o
 * valor do atendimento ajustável. No modo "complete" é o "Concluir e receber"
 * do drawer: conclui e registra numa transação só, com "Só concluir" ao lado.
 * O SaaS não processa pagamento — só registra o que já foi pago fora.
 */
export function PaymentForm({
  appointmentId,
  timezone,
  summary,
  mode,
  onDone,
  onCancel,
}: {
  appointmentId: string;
  timezone: string;
  summary: PaymentFormSummary;
  mode: "register" | "complete";
  onDone: () => void;
  onCancel: () => void;
}) {
  const today = todayInTimeZone(timezone);
  // Desconto e valor do atendimento: só quem tem a permissão (o dono). O profissional registra o que entrou.
  const canDiscount = useAdminAccess().can("payment.discount");
  const [priceCents, setPriceCents] = useState(summary.priceCents);
  const [amountCents, setAmountCents] = useState(summary.balanceCents);
  const [amountTouched, setAmountTouched] = useState(false);
  const [discountCents, setDiscountCents] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.PIX);
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"pay" | "complete-only" | null>(null);

  // Saldo previsto depois deste recebimento (mesma regra do servidor).
  const after = summarizePayments(priceCents, [
    { amountCents: summary.paidCents, discountCents: summary.discountCents },
    { amountCents, discountCents },
  ]);

  function updatePrice(cents: number) {
    setPriceCents(cents);
    // Enquanto o valor recebido não foi mexido, acompanha o novo saldo.
    if (!amountTouched) setAmountCents(Math.max(0, cents - summary.discountCents - summary.paidCents));
  }

  async function send(body: unknown, url: string, kind: "pay" | "complete-only") {
    setError(null);
    setSubmitting(kind);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Não foi possível salvar");
        return;
      }
      toast.success(
        kind === "complete-only"
          ? "Atendimento concluído. O pagamento fica pendente."
          : mode === "complete"
            ? "Atendimento concluído e pagamento registrado."
            : "Pagamento registrado.",
      );
      onDone();
    } finally {
      setSubmitting(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (amountCents === 0 && discountCents === 0) {
      setError(mode === "complete" ? "Informe o valor recebido ou use “Só concluir”." : "Informe o valor recebido.");
      return;
    }
    if (!date || date > today) {
      setError("A data de recebimento não pode ser no futuro.");
      return;
    }
    const payment = {
      amountCents,
      discountCents,
      method,
      // Hoje: o instante atual. Outro dia: meio-dia local (evita virar o dia no fuso).
      receivedAt: (date === today ? new Date() : localMinutesToUtc(date, 12 * 60, timezone)).toISOString(),
      note: note.trim() || null,
      ...(priceCents !== summary.priceCents ? { priceCents } : {}),
    };
    if (mode === "complete") {
      void send({ payment }, `/api/admin/appointments/${appointmentId}/complete`, "pay");
    } else {
      void send(payment, `/api/admin/appointments/${appointmentId}/payments`, "pay");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-3" noValidate>
      <p className="text-sm font-medium">{mode === "complete" ? "Concluir e receber" : "Registrar pagamento"}</p>

      {/* Uma coluna no celular (o drawer tem ~290px); duas a partir de sm. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {canDiscount ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pf-price">Valor do atendimento</Label>
            <MoneyInput id="pf-price" valueCents={priceCents} onValueChange={updatePrice} />
          </div>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pf-amount">Valor recebido</Label>
          <MoneyInput
            id="pf-amount"
            valueCents={amountCents}
            onValueChange={(cents) => {
              setAmountTouched(true);
              setAmountCents(cents);
            }}
          />
        </div>
        {canDiscount ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pf-discount">Desconto</Label>
            <MoneyInput id="pf-discount" valueCents={discountCents} onValueChange={setDiscountCents} />
          </div>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pf-date">Recebido em</Label>
          <Input id="pf-date" type="date" max={today} value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Forma de pagamento</legend>
        <div role="radiogroup" aria-label="Forma de pagamento" className="flex flex-wrap gap-1.5">
          {METHODS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={method === option}
              onClick={() => setMethod(option)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                method === option
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted",
              )}
            >
              {PAYMENT_METHOD_LABELS[option]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pf-note">Observação (opcional)</Label>
        <Input id="pf-note" placeholder="Ex.: sinal, pagou metade no cartão" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <p className="text-caption text-muted-foreground" aria-live="polite">
        {after.balanceCents > 0
          ? `Depois deste registro ainda faltam ${formatPriceFromCents(after.balanceCents)}.`
          : "Com este registro o atendimento fica quitado."}
      </p>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={submitting != null}>
          {submitting === "pay" ? "Salvando…" : mode === "complete" ? "Concluir e registrar" : "Registrar pagamento"}
        </Button>
        {mode === "complete" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={submitting != null}
            onClick={() => void send({}, `/api/admin/appointments/${appointmentId}/complete`, "complete-only")}
          >
            {submitting === "complete-only" ? "Salvando…" : "Só concluir"}
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="ghost" disabled={submitting != null} onClick={onCancel}>
          Voltar
        </Button>
      </div>
    </form>
  );
}
