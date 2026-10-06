"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  CalendarClock,
  Download,
  Receipt,
  RotateCcw,
  TicketPercent,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  Wallet,
  XCircle,
} from "lucide-react";

import { MethodBreakdown } from "@/components/admin/method-breakdown";
import { PeriodPicker } from "@/components/admin/period-picker";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/kpi-card";
import { TableRowsSkeleton } from "@/components/skeletons";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lowerTerm, mostRequestedLabel } from "@/config/vertical";
import { useVertical } from "@/config/vertical-context";
import type { AppointmentStatus } from "@/generated/prisma/enums";
import { STATUS_LABELS, STATUS_TONE } from "@/lib/appointment-status";
import { formatPriceFromCents } from "@/lib/currency";
import { todayInTimeZone } from "@/lib/date";
import { comparisonRanges, resolvePeriod, type PeriodPreset } from "@/lib/period";
import { useFetchJson } from "@/lib/use-fetch-json";
import { delta, rateDelta } from "@/server/modules/report/report-rules";
import type {
  AppointmentsReport,
  ClientsReport,
  ProfessionalsReport,
  ReportSection,
  RevenueReport,
  ServicesReport,
} from "@/server/modules/report/report.service";

import { ChartCard, DailyColumnChart, DataTable, HorizontalBarChart } from "./report-charts";

const SECTION_LABELS: Record<ReportSection, string> = {
  atendimentos: "Atendimentos",
  faturamento: "Faturamento",
  profissionais: "", // termo do preset
  servicos: "", // termo do preset
  clientes: "", // termo do preset
};

/** Baixa um arquivo da API (a sessão vai no cookie; o nome vem do Content-Disposition). */
function downloadFile(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = "";
  link.click();
}

const percent = (value: number | null) =>
  value == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(value);
const formatDate = (dateISO: string) => `${dateISO.slice(8, 10)}/${dateISO.slice(5, 7)}/${dateISO.slice(0, 4)}`;
const formatShort = (dateISO: string) => `${dateISO.slice(8, 10)}/${dateISO.slice(5, 7)}`;
const shortRange = (r: { startDate: string; endDate: string }) =>
  r.startDate === r.endDate ? formatShort(r.startDate) : `${formatShort(r.startDate)} a ${formatShort(r.endDate)}`;

/** O que o "vs. período anterior" compara, em palavras (mesma regra do servidor: `comparisonRanges`). */
function describeComparison(range: { startDate: string; endDate: string }, today: string): string {
  const { current, previous, cut } = comparisonRanges(range, today);
  return cut
    ? `comparação até hoje: ${shortRange(current)} com ${shortRange(previous)}`
    : `comparado com ${shortRange(previous)}`;
}

/** Eixo do gráfico em reais inteiros ("R$ 300"). */
const reaisTick = (reais: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(reais);

export function ReportsView({
  timezone,
  initialPreset,
  initialCustom,
  initialSection,
}: {
  timezone: string;
  initialPreset: PeriodPreset;
  initialCustom: { startDate: string | null; endDate: string | null };
  initialSection: ReportSection;
}) {
  const { terms, features } = useVertical();
  const today = todayInTimeZone(timezone);
  const [preset, setPreset] = useState<PeriodPreset>(initialPreset);
  const [custom, setCustom] = useState(() => resolvePeriod("personalizado", today, initialCustom));
  const range = resolvePeriod(preset, today, custom);
  const [section, setSection] = useState<ReportSection>(initialSection);
  const [reloadKey, setReloadKey] = useState(0);

  // A URL guarda período e aba (dá para voltar e compartilhar o link).
  useEffect(() => {
    const params = new URLSearchParams({ periodo: preset, aba: section });
    if (preset === "personalizado") {
      params.set("inicio", range.startDate);
      params.set("fim", range.endDate);
    }
    window.history.replaceState(null, "", `/admin/relatorios?${params}`);
  }, [preset, section, range.startDate, range.endDate]);

  const rangeQuery = `startDate=${range.startDate}&endDate=${range.endDate}`;
  const report = useFetchJson<{ report: unknown }>(`/api/admin/reports?${rangeQuery}&secao=${section}`, reloadKey);
  const labels: Record<ReportSection, string> = {
    ...SECTION_LABELS,
    profissionais: terms.professional.plural,
    servicos: terms.service.plural,
    clientes: terms.client.plural,
  };

  return (
    <main className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-page-title font-bold">Relatórios</h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(range.startDate)}
            {range.startDate !== range.endDate ? ` – ${formatDate(range.endDate)}` : ""} · {describeComparison(range, today)}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <PeriodPicker idPrefix="rel" preset={preset} onPresetChange={setPreset} custom={custom} onCustomChange={setCustom} />
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" />}>
              <Download />
              Exportar CSV
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => downloadFile(`/api/admin/reports/export?tipo=recebimentos&${rangeQuery}`)}>
                Recebimentos do período
              </DropdownMenuItem>
              {features.commissions ? (
                <DropdownMenuItem onClick={() => downloadFile(`/api/admin/reports/export?tipo=comissoes&${rangeQuery}`)}>
                  Fechamento de comissões
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs value={section} onValueChange={(value) => setSection(value as ReportSection)}>
        {/* No celular as 5 abas rolam na horizontal; no desktop cabem. */}
        <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden sm:w-fit sm:overflow-visible">
          {(Object.keys(labels) as ReportSection[]).map((key) => (
            <TabsTrigger key={key} value={key} className="shrink-0">
              {labels[key]}
            </TabsTrigger>
          ))}
        </TabsList>

        {(Object.keys(labels) as ReportSection[]).map((key) => (
          <TabsContent key={key} value={key} className="flex flex-col gap-5 pt-4">
            {key !== section ? null : report.error ? (
              <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
                <span className="flex-1">Não foi possível carregar o relatório.</span>
                <Button size="sm" variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
                  <RotateCcw />
                  Tentar de novo
                </Button>
              </div>
            ) : !report.data ? (
              <LoadingSection />
            ) : key === "atendimentos" ? (
              <AppointmentsSection report={report.data.report as AppointmentsReport} />
            ) : key === "faturamento" ? (
              <RevenueSection report={report.data.report as RevenueReport} />
            ) : key === "profissionais" ? (
              <ProfessionalsSection report={report.data.report as ProfessionalsReport} />
            ) : key === "servicos" ? (
              <ServicesSection report={report.data.report as ServicesReport} />
            ) : (
              <ClientsSection report={report.data.report as ClientsReport} />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </main>
  );
}

function KpiGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>;
}

function LoadingSection() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="Carregando relatório">
      <KpiGrid>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </KpiGrid>
      <div className="rounded-lg border bg-card p-4">
        <TableRowsSkeleton rows={5} columns={3} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function AppointmentsSection({ report }: { report: AppointmentsReport }) {
  const { terms } = useVertical();
  const { current, compare, previous } = report;
  const statusEntries = Object.entries(current.byStatus) as [AppointmentStatus, number][];
  return (
    <>
      <KpiGrid>
        <KpiCard
          icon={CalendarClock}
          label="Agendamentos"
          value={String(current.total)}
          delta={{ value: delta(compare.total, previous.total) }}
        />
        <KpiCard
          icon={XCircle}
          label="Taxa de cancelamento"
          value={percent(current.cancellationRate)}
          delta={{
            value: rateDelta({ rate: compare.cancellationRate, total: compare.total }, { rate: previous.cancellationRate, total: previous.total }),
            kind: "points",
            higherIsBetter: false,
          }}
        />
        <KpiCard
          icon={UserX}
          label="Taxa de faltas"
          value={percent(current.noShowRate)}
          delta={{
            value: rateDelta({ rate: compare.noShowRate, total: compare.total }, { rate: previous.noShowRate, total: previous.total }),
            kind: "points",
            higherIsBetter: false,
          }}
        />
        <KpiCard
          icon={Trophy}
          label={mostRequestedLabel(terms.professional)}
          value={
            current.mostRequestedProfessional
              ? `${current.mostRequestedProfessional.name} (${current.mostRequestedProfessional.count})`
              : "—"
          }
        />
      </KpiGrid>

      <ChartCard
        title="Agendamentos por dia"
        chart={<DailyColumnChart data={current.byDay} />}
        table={<DataTable columns={["Data", "Agendamentos"]} rows={current.byDay.map((d) => [formatDate(d.date), d.count])} />}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard
          title={`Agendamentos por ${lowerTerm(terms.professional.singular)}`}
          chart={
            current.byProfessional.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum agendamento no período.</p>
            ) : (
              <HorizontalBarChart rows={current.byProfessional.map((p) => ({ key: p.id, label: p.name, value: p.count }))} />
            )
          }
          table={
            <DataTable
              columns={[terms.professional.singular, "Agendamentos"]}
              rows={current.byProfessional.map((p) => [p.name, p.count])}
            />
          }
        />
        <ChartCard
          title="Agendamentos por status"
          chart={
            <HorizontalBarChart
              rows={statusEntries.map(([status, count]) => ({
                key: status,
                label: <StatusBadge tone={STATUS_TONE[status]}>{STATUS_LABELS[status]}</StatusBadge>,
                value: count,
              }))}
            />
          }
          table={
            <DataTable columns={["Status", "Agendamentos"]} rows={statusEntries.map(([s, c]) => [STATUS_LABELS[s], c])} />
          }
        />
      </div>
    </>
  );
}

function RevenueSection({ report }: { report: RevenueReport }) {
  const { current, compare, previous } = report;
  const ticketDelta =
    compare.averageTicketCents != null && previous.averageTicketCents != null
      ? delta(compare.averageTicketCents, previous.averageTicketCents)
      : null;
  return (
    <>
      <KpiGrid>
        <KpiCard
          icon={Wallet}
          label="Recebido"
          value={formatPriceFromCents(current.receivedCents)}
          delta={{ value: delta(compare.receivedCents, previous.receivedCents) }}
        />
        <KpiCard
          icon={Receipt}
          label="Ticket médio"
          value={current.averageTicketCents == null ? "—" : formatPriceFromCents(current.averageTicketCents)}
          hint="por atendimento concluído no período"
          delta={{ value: ticketDelta }}
        />
        <KpiCard
          icon={TicketPercent}
          label="Descontos"
          value={formatPriceFromCents(current.discountCents)}
          delta={{ value: delta(compare.discountCents, previous.discountCents), higherIsBetter: false }}
        />
        <KpiCard icon={CalendarClock} label="Recebimentos" value={String(current.paymentsCount)} />
      </KpiGrid>

      {current.paymentsCount === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Nenhum recebimento neste período"
          description="Os pagamentos são registrados no próprio agendamento, na Agenda."
        />
      ) : (
        <>
          <ChartCard
            title="Recebido por dia"
            chart={
              <DailyColumnChart
                // Em reais no gráfico (eixo legível); valores exatos no tooltip e na tabela.
                data={current.byDay.map((d) => ({ date: d.date, count: d.value / 100 }))}
                describe={(reais) => formatPriceFromCents(Math.round(reais * 100))}
                formatTick={reaisTick}
                axisWidthClass="w-16"
              />
            }
            table={
              <DataTable
                columns={["Data", "Recebido"]}
                rows={current.byDay.map((d) => [formatDate(d.date), d.value])}
                formatValue={formatPriceFromCents}
              />
            }
          />
          <MethodBreakdown byMethod={current.byMethod} />
        </>
      )}
    </>
  );
}

function ProfessionalsSection({ report }: { report: ProfessionalsReport }) {
  const { terms, features } = useVertical();
  if (report.rows.length === 0) {
    return <EmptyState icon={Users} title={`Nenhum ${lowerTerm(terms.professional.singular)} com movimento`} />;
  }
  return (
    <>
      <div className="hidden rounded-lg border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{terms.professional.singular}</TableHead>
              <TableHead className="text-right">Agendamentos</TableHead>
              <TableHead className="text-right">Concluídos</TableHead>
              <TableHead className="text-right">Faltas</TableHead>
              <TableHead className="text-right">Ocupação</TableHead>
              <TableHead className="text-right">Recebido</TableHead>
              {features.commissions ? <TableHead className="text-right">Comissão</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Link
                    href={`/admin/profissionais/${row.id}`}
                    className="font-medium hover:underline focus-visible:underline focus-visible:outline-none"
                  >
                    {row.name}
                  </Link>
                </TableCell>
                <TableCell className="text-right tabular-nums">{row.appointments}</TableCell>
                <TableCell className="text-right tabular-nums">{row.completed}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.noShows}
                  {row.noShowRate != null && row.noShows > 0 ? (
                    <span className="text-caption text-muted-foreground"> ({percent(row.noShowRate)})</span>
                  ) : null}
                </TableCell>
                <TableCell className="text-right tabular-nums">{percent(row.occupancyRate)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPriceFromCents(row.receivedCents)}</TableCell>
                {features.commissions ? (
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatPriceFromCents(row.commissionCents)}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="flex flex-col gap-2 md:hidden">
        {report.rows.map((row) => (
          <li key={row.id} className="rounded-lg border bg-card p-3 text-sm shadow-sm">
            <Link href={`/admin/profissionais/${row.id}`} className="font-medium hover:underline">
              {row.name}
            </Link>
            <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
              <MiniStat label="Agend." value={String(row.appointments)} />
              <MiniStat label="Faltas" value={String(row.noShows)} />
              <MiniStat label="Ocupação" value={percent(row.occupancyRate)} />
              <MiniStat label="Recebido" value={formatPriceFromCents(row.receivedCents)} wide={!features.commissions} />
              {features.commissions ? (
                <MiniStat label="Comissão" value={formatPriceFromCents(row.commissionCents)} wide />
              ) : null}
            </dl>
          </li>
        ))}
      </ul>
      <p className="text-caption text-muted-foreground">
        Agendamentos não contam cancelados. Ocupação = minutos agendados ÷ expediente do período (sem intervalos e
        bloqueios). Recebido e comissão pela data de recebimento.
      </p>
    </>
  );
}

function MiniStat({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2 rounded-md bg-muted/40 p-1.5" : "rounded-md bg-muted/40 p-1.5"}>
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function ServicesSection({ report }: { report: ServicesReport }) {
  const { terms } = useVertical();
  const [metric, setMetric] = useState<"receita" | "quantidade">("receita");
  if (report.rows.length === 0) {
    return <EmptyState icon={Receipt} title={`Nenhum ${lowerTerm(terms.service.singular)} com movimento no período`} />;
  }
  const byRevenue = metric === "receita";
  const rows = [...report.rows].sort((a, b) =>
    byRevenue ? b.receivedCents - a.receivedCents : b.appointments - a.appointments,
  );
  return (
    <>
      <div role="radiogroup" aria-label="Ordenar por" className="flex gap-1.5">
        {(
          [
            ["receita", "Por receita"],
            ["quantidade", "Por quantidade"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={metric === value}
            onClick={() => setMetric(value)}
            className={
              metric === value
                ? "rounded-full border border-primary bg-primary px-3 py-1 text-sm text-primary-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                : "rounded-full border bg-background px-3 py-1 text-sm hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            }
          >
            {label}
          </button>
        ))}
      </div>
      <ChartCard
        title={byRevenue ? `Receita por ${lowerTerm(terms.service.singular)}` : `Agendamentos por ${lowerTerm(terms.service.singular)}`}
        chart={
          <HorizontalBarChart
            rows={rows.map((r) => ({ key: r.id, label: r.name, value: byRevenue ? r.receivedCents : r.appointments }))}
            formatValue={byRevenue ? formatPriceFromCents : String}
          />
        }
        table={
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1.5 font-medium">{terms.service.singular}</th>
                  <th className="py-1.5 text-right font-medium">Agendamentos</th>
                  <th className="py-1.5 text-right font-medium">Concluídos</th>
                  <th className="py-1.5 text-right font-medium">Recebido</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-1.5">{r.name}</td>
                    <td className="py-1.5 text-right tabular-nums">{r.appointments}</td>
                    <td className="py-1.5 text-right tabular-nums">{r.completed}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatPriceFromCents(r.receivedCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      />
    </>
  );
}

function ClientsSection({ report }: { report: ClientsReport }) {
  const { terms } = useVertical();
  const { current, compare, previous } = report;
  return (
    <>
      <KpiGrid>
        <KpiCard
          icon={Users}
          label="Atendidos"
          value={String(current.served)}
          delta={{ value: delta(compare.served, previous.served) }}
        />
        <KpiCard
          icon={UserPlus}
          label="Novos"
          value={String(current.newClients)}
          delta={{ value: delta(compare.newClients, previous.newClients) }}
        />
        <KpiCard
          icon={UserCheck}
          label="Voltaram"
          value={String(current.returning)}
          delta={{ value: delta(compare.returning, previous.returning) }}
        />
        <KpiCard
          icon={Trophy}
          label="Taxa de retorno"
          value={current.served > 0 ? percent(current.returning / current.served) : "—"}
        />
      </KpiGrid>

      <section className="rounded-lg border bg-card p-4" aria-labelledby="top-clients">
        <h2 id="top-clients" className="mb-3 text-sm font-semibold">
          Quem mais gastou no período
        </h2>
        {current.topSpenders.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum recebimento no período.</p>
        ) : (
          <ol className="flex flex-col divide-y">
            {current.topSpenders.map((client, index) => (
              <li key={client.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-5 text-right text-muted-foreground tabular-nums">{index + 1}</span>
                <Link
                  href={`/admin/clientes?cliente=${client.id}`}
                  className="min-w-0 flex-1 truncate font-medium hover:underline focus-visible:underline focus-visible:outline-none"
                >
                  {client.name}
                </Link>
                <span className="text-caption text-muted-foreground">
                  {/* Pagou no período por um atendimento de outra data (ex.: sinal de algo futuro). */}
                  {client.visits === 0
                    ? "pagamento antecipado"
                    : `${client.visits} ${client.visits === 1 ? "visita" : "visitas"}`}
                </span>
                <span className="w-24 text-right font-semibold tabular-nums">{formatPriceFromCents(client.receivedCents)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
      <p className="text-caption text-muted-foreground">
        “Novos” = primeiro atendimento (não cancelado) caiu neste período. “Voltaram” = já tinham vindo antes. Para achar{" "}
        {lowerTerm(terms.client.plural)} que sumiram, use o filtro em {terms.client.plural}.
      </p>
    </>
  );
}
