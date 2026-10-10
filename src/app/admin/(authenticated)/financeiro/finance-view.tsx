"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CircleCheck, HandCoins, Receipt, RotateCcw, TicketPercent, Wallet } from "lucide-react";

import { useAdminShell } from "@/components/admin/admin-shell-context";
import { MethodBreakdown } from "@/components/admin/method-breakdown";
import { PeriodPicker } from "@/components/admin/period-picker";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/kpi-card";
import { TableRowsSkeleton } from "@/components/skeletons";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVertical } from "@/config/vertical-context";
import { PaymentMethod } from "@/generated/prisma/enums";
import { formatPriceFromCents } from "@/lib/currency";
import { todayInTimeZone } from "@/lib/date";
import { PAYMENT_METHOD_LABELS } from "@/server/modules/payment/payment-rules";
import type {
  CommissionRow,
  FinanceSummary,
  PaymentRow,
  ReceivableRow,
} from "@/server/modules/payment/payment.service";

import { AppointmentDrawer } from "../agenda/appointment-drawer";
import type { ProfessionalOption } from "../agenda/types";
import { resolvePeriod, type PeriodPreset } from "@/lib/period";
import { useFetchJson } from "@/lib/use-fetch-json";

export type FinanceTab = "recebimentos" | "a-receber" | "comissoes";

const ALL = "all";

export function FinanceView({
  timezone,
  professionals,
  initialPreset,
  initialCustom,
  initialTab,
}: {
  timezone: string;
  professionals: ProfessionalOption[];
  initialPreset: PeriodPreset;
  initialCustom: { startDate: string | null; endDate: string | null };
  initialTab: FinanceTab;
}) {
  const { terms, features } = useVertical();
  // Plano Solo: todo recebimento é da mesma pessoa; filtro e coluna de profissional não dizem nada.
  const { solo } = useAdminShell();
  const today = todayInTimeZone(timezone);
  const [preset, setPreset] = useState<PeriodPreset>(initialPreset);
  const [custom, setCustom] = useState(() => resolvePeriod("personalizado", today, initialCustom));
  const range = resolvePeriod(preset, today, custom);
  const [tab, setTab] = useState<FinanceTab>(
    initialTab === "comissoes" && !features.commissions ? "recebimentos" : initialTab,
  );
  const [method, setMethod] = useState<string>(ALL);
  const [professionalId, setProfessionalId] = useState<string>(ALL);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  /** "Receber" abre a gaveta já com o formulário de pagamento (sem o clique extra). */
  const [payOnOpen, setPayOnOpen] = useState(false);
  const openAppointment = (id: string, pay = false) => {
    setPayOnOpen(pay);
    setSelectedAppointmentId(id);
  };

  // A URL guarda período e aba (dá para voltar e compartilhar o link).
  useEffect(() => {
    const params = new URLSearchParams({ periodo: preset, aba: tab });
    if (preset === "personalizado") {
      params.set("inicio", range.startDate);
      params.set("fim", range.endDate);
    }
    window.history.replaceState(null, "", `/admin/financeiro?${params}`);
  }, [preset, tab, range.startDate, range.endDate]);

  const rangeQuery = `startDate=${range.startDate}&endDate=${range.endDate}`;
  const paymentFilters = `${method !== ALL ? `&method=${method}` : ""}${professionalId !== ALL ? `&professionalId=${professionalId}` : ""}`;
  const summary = useFetchJson<{ summary: FinanceSummary }>(`/api/admin/finance/summary?${rangeQuery}`, reloadKey);
  const payments = useFetchJson<{ payments: PaymentRow[] }>(
    `/api/admin/finance/payments?${rangeQuery}${paymentFilters}`,
    reloadKey,
  );
  const receivables = useFetchJson<{ receivables: ReceivableRow[] }>("/api/admin/finance/receivables", reloadKey);
  const commissions = useFetchJson<{ commissions: CommissionRow[] }>(
    features.commissions ? `/api/admin/finance/commissions?${rangeQuery}` : null,
    reloadKey,
  );

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, dateStyle: "short" }).format(new Date(iso));
  const formatIsoDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
  const reloadAll = () => setReloadKey((k) => k + 1);

  return (
    <main className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-page-title font-bold">Financeiro</h1>
          <p className="text-sm text-muted-foreground">
            {formatIsoDate(range.startDate)}
            {range.startDate !== range.endDate ? ` – ${formatIsoDate(range.endDate)}` : ""} · pela data de recebimento
          </p>
        </div>
        <PeriodPicker
          idPrefix="fin"
          preset={preset}
          onPresetChange={setPreset}
          custom={custom}
          onCustomChange={setCustom}
        />
      </div>

      {summary.error ? (
        <ErrorBanner message="Não foi possível carregar o resumo." onRetry={reloadAll} />
      ) : !summary.data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy aria-label="Carregando resumo">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard icon={Wallet} label="Recebido no período" value={formatPriceFromCents(summary.data.summary.receivedCents)} />
            <KpiCard
              icon={HandCoins}
              label={`A receber (${summary.data.summary.receivableCount})`}
              value={formatPriceFromCents(summary.data.summary.receivableCents)}
            />
            <KpiCard
              icon={Receipt}
              label="Ticket médio"
              hint="por atendimento concluído no período"
              value={
                summary.data.summary.averageTicketCents == null
                  ? "—"
                  : formatPriceFromCents(summary.data.summary.averageTicketCents)
              }
            />
            <KpiCard icon={TicketPercent} label="Descontos" value={formatPriceFromCents(summary.data.summary.discountCents)} />
          </div>
          <MethodBreakdown byMethod={summary.data.summary.byMethod} />
        </>
      )}

      <Tabs value={tab} onValueChange={(value) => setTab(value as FinanceTab)}>
        <TabsList>
          <TabsTrigger value="recebimentos">Recebimentos</TabsTrigger>
          <TabsTrigger value="a-receber">
            A receber
            {summary.data && summary.data.summary.receivableCount > 0 ? (
              <span className="text-caption text-muted-foreground">{summary.data.summary.receivableCount}</span>
            ) : null}
          </TabsTrigger>
          {features.commissions ? <TabsTrigger value="comissoes">Comissões</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="recebimentos" className="flex flex-col gap-3 pt-3">
          <div className="flex flex-wrap gap-2">
            <Select value={method} onValueChange={(value) => setMethod(value ?? ALL)}>
              <SelectTrigger aria-label="Forma de pagamento" className="w-44">
                <SelectValue>
                  {(value: string) => (value === ALL ? "Todas as formas" : PAYMENT_METHOD_LABELS[value as PaymentMethod])}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas as formas</SelectItem>
                {Object.values(PaymentMethod).map((m) => (
                  <SelectItem key={m} value={m}>
                    {PAYMENT_METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {solo ? null : (
            <Select value={professionalId} onValueChange={(value) => setProfessionalId(value ?? ALL)}>
              <SelectTrigger aria-label={terms.professional.singular} className="w-48">
                <SelectValue>
                  {(value: string) =>
                    value === ALL
                      ? `Todos os ${terms.professional.plural.toLowerCase()}`
                      : professionals.find((p) => p.id === value)?.name
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos os {terms.professional.plural.toLowerCase()}</SelectItem>
                {professionals.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            )}
          </div>

          {payments.error ? (
            <ErrorBanner message="Não foi possível carregar os recebimentos." onRetry={reloadAll} />
          ) : !payments.data ? (
            <LoadingTable />
          ) : payments.data.payments.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="Nenhum recebimento neste período"
              description="Os pagamentos são registrados no próprio agendamento, na Agenda."
              action={
                <Link href="/admin/agenda" className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Ir para a Agenda
                </Link>
              }
            />
          ) : (
            <>
              <div className="hidden rounded-lg border bg-card md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recebido em</TableHead>
                      <TableHead>Cliente · serviço</TableHead>
                      {solo ? null : <TableHead>{terms.professional.singular}</TableHead>}
                      <TableHead>Forma</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.data.payments.map((payment) => (
                      <TableRow
                        key={payment.id}
                        className="cursor-pointer"
                        onClick={() => openAppointment(payment.appointmentId)}
                      >
                        <TableCell className="tabular-nums">{formatDate(payment.receivedAt)}</TableCell>
                        <TableCell>
                          <button
                            type="button"
                            className="text-left font-medium hover:underline focus-visible:underline focus-visible:outline-none"
                            onClick={(event) => {
                              event.stopPropagation();
                              openAppointment(payment.appointmentId);
                            }}
                          >
                            {payment.clientName}
                          </button>
                          <span className="block text-caption text-muted-foreground">
                            {payment.serviceName}
                            {payment.note ? ` · ${payment.note}` : ""}
                          </span>
                        </TableCell>
                        {solo ? null : <TableCell>{payment.professional.name}</TableCell>}
                        <TableCell>{payment.amountCents > 0 ? PAYMENT_METHOD_LABELS[payment.method] : "Desconto"}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {payment.amountCents > 0 ? formatPriceFromCents(payment.amountCents) : "—"}
                          {payment.discountCents > 0 ? (
                            <span className="block text-caption text-muted-foreground">
                              desconto {formatPriceFromCents(payment.discountCents)}
                            </span>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ul className="flex flex-col gap-2 md:hidden">
                {payments.data.payments.map((payment) => (
                  <li key={payment.id}>
                    <button
                      type="button"
                      onClick={() => openAppointment(payment.appointmentId)}
                      className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left shadow-sm transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{payment.clientName}</span>
                        <span className="block truncate text-caption text-muted-foreground">
                          {formatDate(payment.receivedAt)} ·{" "}
                          {payment.amountCents > 0 ? PAYMENT_METHOD_LABELS[payment.method] : "Desconto"}
                          {solo ? null : ` · ${payment.professional.name}`}
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {formatPriceFromCents(payment.amountCents > 0 ? payment.amountCents : payment.discountCents)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </TabsContent>

        <TabsContent value="a-receber" className="flex flex-col gap-3 pt-3">
          <p className="text-sm text-muted-foreground">
            Atendimentos concluídos com saldo em aberto, de qualquer data.
          </p>
          {receivables.error ? (
            <ErrorBanner message="Não foi possível carregar o que falta receber." onRetry={reloadAll} />
          ) : !receivables.data ? (
            <LoadingTable />
          ) : receivables.data.receivables.length === 0 ? (
            <EmptyState icon={CircleCheck} title="Nada a receber" description="Todos os atendimentos concluídos estão pagos." />
          ) : (
            <ul className="flex flex-col gap-2">
              {receivables.data.receivables.map((row) => (
                <li
                  key={row.appointmentId}
                  className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3 text-sm shadow-sm"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{row.clientName}</span>
                    <span className="block truncate text-caption text-muted-foreground">
                      {formatDate(row.startAt)} · {row.serviceName} · {row.professionalName}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-semibold text-payment-pending tabular-nums">
                      falta {formatPriceFromCents(row.summary.balanceCents)}
                    </span>
                    <span className="block text-caption text-muted-foreground tabular-nums">
                      de {formatPriceFromCents(row.summary.priceCents)}
                    </span>
                  </span>
                  <Button size="sm" variant="outline" onClick={() => openAppointment(row.appointmentId, true)}>
                    Receber
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        {features.commissions ? (
          <TabsContent value="comissoes" className="flex flex-col gap-3 pt-3">
            <p className="text-sm text-muted-foreground">
              Soma, pagamento a pagamento, da % que valia no dia do registro sobre o valor recebido no período. Para mudar
              a %, edite o cadastro — o que já foi recebido não muda.
            </p>
            {commissions.error ? (
              <ErrorBanner message="Não foi possível carregar as comissões." onRetry={reloadAll} />
            ) : !commissions.data ? (
              <LoadingTable />
            ) : (
              <div className="rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{terms.professional.singular}</TableHead>
                      <TableHead className="text-right">% atual</TableHead>
                      <TableHead className="text-right">Recebido</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions.data.commissions.map((row) => (
                      <TableRow key={row.professional.id}>
                        <TableCell>
                          <Link
                            href={`/admin/profissionais/${row.professional.id}`}
                            className="font-medium hover:underline focus-visible:underline focus-visible:outline-none"
                          >
                            {row.professional.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.professional.commissionPercent == null ? "—" : `${row.professional.commissionPercent}%`}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatPriceFromCents(row.receivedCents)}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatPriceFromCents(row.commissionCents)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={2}>Total</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPriceFromCents(commissions.data.commissions.reduce((s, r) => s + r.receivedCents, 0))}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatPriceFromCents(commissions.data.commissions.reduce((s, r) => s + r.commissionCents, 0))}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
          </TabsContent>
        ) : null}
      </Tabs>

      <AppointmentDrawer
        appointmentId={selectedAppointmentId}
        timezone={timezone}
        professionals={professionals}
        startWithPayment={payOnOpen}
        onClose={() => setSelectedAppointmentId(null)}
        onChanged={reloadAll}
      />
    </main>
  );
}

function LoadingTable() {
  return (
    <div className="rounded-lg border bg-card p-4" aria-busy aria-label="Carregando">
      <TableRowsSkeleton rows={4} columns={4} />
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
      <span className="flex-1">{message}</span>
      <Button size="sm" variant="outline" onClick={onRetry}>
        <RotateCcw />
        Tentar de novo
      </Button>
    </div>
  );
}
