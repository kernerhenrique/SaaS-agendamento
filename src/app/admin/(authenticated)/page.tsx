import Link from "next/link";
import { AlertTriangle, CalendarCheck, CalendarClock, CalendarPlus, CircleAlert, Percent, CalendarDays, Gauge, HandCoins, UserPlus, UserX, Wallet } from "lucide-react";

import { NewAppointmentButton } from "@/components/admin/new-appointment-button";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getVertical, lowerTerm } from "@/config/vertical";
import { STATUS_LABELS, STATUS_TONE } from "@/lib/appointment-status";
import { formatPriceFromCents } from "@/lib/currency";
import { cn } from "cn";
import { formatDateLabel } from "@/lib/date";
import { prisma } from "@/server/db/prisma";
import { can, professionalScope } from "@/server/modules/auth/permissions";
import { requireAdminSession } from "@/server/modules/auth/session";
import { INACTIVE_CLIENT_DAYS, getDashboard } from "@/server/modules/dashboard/dashboard.service";

import { getProfessionalOptions } from "./agenda/professional-options";
import { HomeAppointmentsProvider, OpenAppointmentButton } from "./home-appointments";

export const metadata = { title: "Início" };

const percent = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0 });
const formatRate = (rate: number | null) => (rate === null ? "—" : percent.format(rate));

export default async function InicioPage() {
  const session = await requireAdminSession();
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: session.businessId },
    select: { timezone: true, businessType: true },
  });
  const { terms } = getVertical(business.businessType);
  // Profissional: o Início mostra só os números dele, sem links para as telas do dono.
  const canFinance = can(session.role, "finance.view");
  const canCatalog = can(session.role, "catalog.manage");
  const [data, professionals] = await Promise.all([
    getDashboard(session.businessId, business.timezone, undefined, professionalScope(session)),
    getProfessionalOptions(session.businessId, professionalScope(session)),
  ]);

  const formatTime = (iso: string) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: business.timezone, hour: "2-digit", minute: "2-digit" }).format(
      new Date(iso),
    );
  const formatDayTime = (iso: string) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: business.timezone, weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
      .format(new Date(iso))
      .replace(".", "");
  const online = data.alerts.recentOnlineBookings;
  const pastOpen = data.alerts.pastWithoutOutcome;
  const hasAlerts =
    online.count > 0 ||
    pastOpen.count > 0 ||
    data.alerts.professionalsWithoutHours.length > 0 ||
    data.alerts.inactiveClients > 0 ||
    data.alerts.completedWithoutPayment.count > 0 ||
    data.alerts.completedPartialPayment.count > 0;

  return (
    <HomeAppointmentsProvider timezone={business.timezone} professionals={professionals}>
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-page-title font-bold">Início</h1>
        <p className="text-sm text-muted-foreground first-letter:uppercase">
          {formatDateLabel(data.today, business.timezone)}
        </p>
      </div>

      <section aria-label="Resumo do mês" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <KpiLink href={canFinance ? "/admin/financeiro?periodo=mes&aba=recebimentos" : undefined}>
          <KpiCard icon={Wallet} label="Recebido no mês" value={formatPriceFromCents(data.month.receivedCents)} />
        </KpiLink>
        <KpiLink href={canFinance ? "/admin/financeiro?aba=a-receber" : undefined}>
          <KpiCard
            icon={HandCoins}
            label={`A receber (${data.receivable.count})`}
            value={formatPriceFromCents(data.receivable.cents)}
          />
        </KpiLink>
        <KpiCard icon={CalendarCheck} label="Atendimentos no mês" value={String(data.month.appointments)} />
        <KpiCard icon={Gauge} label="Ocupação da agenda" value={formatRate(data.month.occupancyRate)} />
        <KpiCard icon={UserX} label="Taxa de faltas" value={formatRate(data.month.noShowRate)} />
        {data.month.myCommissionCents !== null ? (
          <KpiCard icon={Percent} label="Minha comissão no mês" value={formatPriceFromCents(data.month.myCommissionCents)} />
        ) : (
          <KpiCard icon={UserPlus} label={`${terms.client.plural} novos`} value={String(data.month.newClients)} />
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Hoje</CardTitle>
            <Link href="/admin/agenda" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              <CalendarDays />
              Ver agenda
            </Link>
          </CardHeader>
          <CardContent>
            {data.todayAppointments.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="Nenhum agendamento hoje"
                description="Encaixe alguém ou compartilhe o link de reserva."
                action={<NewAppointmentButton size="sm" initial={{ date: data.today }} />}
              />
            ) : (
              <ul className="flex flex-col divide-y">
                {data.todayAppointments.map((appointment) => (
                  <li key={appointment.id}>
                    {/* Toque abre o detalhe (concluir, receber, remarcar) sem sair do Início. */}
                    <OpenAppointmentButton appointmentId={appointment.id} className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 px-2 py-3">
                      <span className="w-12 shrink-0 text-sm font-semibold tabular-nums">
                        {formatTime(appointment.startAt)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{appointment.clientName}</span>
                        <span className="block truncate text-caption text-muted-foreground">
                          {appointment.serviceName} · {appointment.professionalName}
                        </span>
                      </span>
                      {appointment.isLate ? (
                        <StatusBadge tone="scheduled">Atrasado</StatusBadge>
                      ) : (
                        <StatusBadge tone={STATUS_TONE[appointment.status]}>{STATUS_LABELS[appointment.status]}</StatusBadge>
                      )}
                    </OpenAppointmentButton>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atenção</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {!hasAlerts ? <p className="text-sm text-muted-foreground">Tudo certo por aqui.</p> : null}
            {pastOpen.count > 0 ? (
              <Alert icon={CalendarClock}>
                <strong>{pastOpen.count}</strong>{" "}
                {pastOpen.count === 1
                  ? "atendimento já passou e continua sem desfecho"
                  : "atendimentos já passaram e continuam sem desfecho"}
                : abra e marque &ldquo;Concluir&rdquo; ou &ldquo;Não compareceu&rdquo;.
                <AlertAppointmentList items={pastOpen.latest} total={pastOpen.count} formatDayTime={formatDayTime} />
              </Alert>
            ) : null}
            {online.count > 0 ? (
              <Alert tone="info">
                <strong>{online.count}</strong>{" "}
                {online.count === 1 ? "reserva nova pela página" : "reservas novas pela página"} nas últimas 24 horas.
                <AlertAppointmentList items={online.latest} total={online.count} formatDayTime={formatDayTime} />
              </Alert>
            ) : null}
            {data.alerts.completedWithoutPayment.count > 0 ? (
              <Alert href={canFinance ? "/admin/financeiro?aba=a-receber" : undefined} tone="destructive">
                <strong>{data.alerts.completedWithoutPayment.count}</strong>{" "}
                {data.alerts.completedWithoutPayment.count === 1
                  ? "atendimento concluído está sem nenhum pagamento"
                  : "atendimentos concluídos estão sem nenhum pagamento"}{" "}
                ({formatPriceFromCents(data.alerts.completedWithoutPayment.cents)}).
              </Alert>
            ) : null}
            {data.alerts.completedPartialPayment.count > 0 ? (
              <Alert href={canFinance ? "/admin/financeiro?aba=a-receber" : undefined}>
                <strong>{data.alerts.completedPartialPayment.count}</strong>{" "}
                {data.alerts.completedPartialPayment.count === 1
                  ? "atendimento concluído com pagamento parcial"
                  : "atendimentos concluídos com pagamento parcial"}{" "}
                (faltam {formatPriceFromCents(data.alerts.completedPartialPayment.cents)}).
              </Alert>
            ) : null}
            {data.alerts.professionalsWithoutHours.map((professional) => (
              <Alert key={professional.id} href={canCatalog ? "/admin/profissionais" : undefined}>
                <strong>{professional.name}</strong> está sem expediente configurado e não recebe reservas.
              </Alert>
            ))}
            {data.alerts.inactiveClients > 0 ? (
              <Alert href="/admin/clientes?filtro=sumidos-60">
                <strong>{data.alerts.inactiveClients}</strong>{" "}
                {data.alerts.inactiveClients === 1
                  ? `${lowerTerm(terms.client.singular)} não volta`
                  : `${lowerTerm(terms.client.plural)} não voltam`}{" "}
                há mais de {INACTIVE_CLIENT_DAYS} dias.
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
    </HomeAppointmentsProvider>
  );
}

/** KPI clicável que leva ao Financeiro (mantém o visual do KpiCard); sem `href`, só o cartão. */
function KpiLink({ href, children }: { href?: string; children: React.ReactNode }) {
  if (!href) return children;
  return (
    <Link
      href={href}
      className="rounded-xl transition-opacity hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      {children}
    </Link>
  );
}

const ALERT_TONES = {
  info: { box: "border-info/30 bg-info/10 hover:bg-info/15", icon: "text-info", Icon: CalendarPlus },
  warning: { box: "border-warning/30 bg-warning/10 hover:bg-warning/15", icon: "text-warning", Icon: AlertTriangle },
  destructive: { box: "border-destructive/30 bg-destructive/10 hover:bg-destructive/15", icon: "text-destructive", Icon: CircleAlert },
} as const;

/** Alerta clicável do quadro "Atenção": azul (novidade), amarelo (atenção) ou vermelho (dinheiro sem nenhum registro). */
function Alert({
  href,
  tone = "warning",
  icon: IconOverride,
  children,
}: {
  /** Sem link quando a tela de destino é do dono (profissional) ou quando a lista de dentro tem os próprios botões. */
  href?: string;
  tone?: keyof typeof ALERT_TONES;
  icon?: typeof CalendarPlus;
  children: React.ReactNode;
}) {
  const { box, icon, Icon: ToneIcon } = ALERT_TONES[tone];
  const Icon = IconOverride ?? ToneIcon;
  const className = cn("flex gap-3 rounded-lg border p-3 text-sm transition-colors", box);
  const content = (
    <>
      <Icon className={cn("mt-0.5 size-4 shrink-0", icon)} />
      <span className="min-w-0 flex-1">{children}</span>
    </>
  );
  if (!href) return <div className={className}>{content}</div>;
  return (
    <Link href={href} className={cn(className, "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none")}>
      {content}
    </Link>
  );
}

/** Itens de um alerta: cada um abre o agendamento no drawer; o que passar do limite entra só na contagem. */
function AlertAppointmentList({
  items,
  total,
  formatDayTime,
}: {
  items: { id: string; startAt: string; clientName: string; serviceName: string }[];
  total: number;
  formatDayTime: (iso: string) => string;
}) {
  return (
    <ul className="mt-1.5 flex flex-col gap-0.5 text-caption">
      {items.map((item) => (
        <li key={item.id}>
          <OpenAppointmentButton
            appointmentId={item.id}
            className="-mx-1.5 w-[calc(100%+0.75rem)] px-1.5 py-1 text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            <span className="first-letter:uppercase">{formatDayTime(item.startAt)}</span> · {item.clientName} · {item.serviceName}
          </OpenAppointmentButton>
        </li>
      ))}
      {total > items.length ? <li className="text-muted-foreground">e mais {total - items.length}</li> : null}
    </ul>
  );
}
