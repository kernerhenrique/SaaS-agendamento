import Link from "next/link";
import { AlertTriangle, CalendarCheck, CalendarDays, Gauge, UserPlus, UserX } from "lucide-react";

import { NewAppointmentButton } from "@/components/admin/new-appointment-button";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getVertical, lowerTerm } from "@/config/vertical";
import { STATUS_LABELS, STATUS_TONE } from "@/lib/appointment-status";
import { formatDateLabel } from "@/lib/date";
import { prisma } from "@/server/db/prisma";
import { requireAdminSession } from "@/server/modules/auth/session";
import { INACTIVE_CLIENT_DAYS, getDashboard } from "@/server/modules/dashboard/dashboard.service";

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
  const data = await getDashboard(session.businessId, business.timezone);

  const formatTime = (iso: string) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: business.timezone, hour: "2-digit", minute: "2-digit" }).format(
      new Date(iso),
    );
  const hasAlerts = data.alerts.professionalsWithoutHours.length > 0 || data.alerts.inactiveClients > 0;

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-page-title font-bold">Início</h1>
        <p className="text-sm text-muted-foreground first-letter:uppercase">
          {formatDateLabel(data.today, business.timezone)}
        </p>
      </div>

      <section aria-label="Resumo do mês" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard icon={CalendarCheck} label="Atendimentos no mês" value={String(data.month.appointments)} />
        <KpiCard icon={Gauge} label="Ocupação da agenda" value={formatRate(data.month.occupancyRate)} />
        <KpiCard icon={UserX} label="Taxa de faltas" value={formatRate(data.month.noShowRate)} />
        <KpiCard
          icon={UserPlus}
          label={`${terms.client.plural} novos`}
          value={String(data.month.newClients)}
        />
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
                  <li key={appointment.id} className="flex items-center gap-3 py-3">
                    <span className="w-12 shrink-0 text-sm font-semibold tabular-nums">
                      {formatTime(appointment.startAt)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{appointment.clientName}</p>
                      <p className="truncate text-caption text-muted-foreground">
                        {appointment.serviceName} · {appointment.professionalName}
                      </p>
                    </div>
                    {appointment.isLate ? (
                      <StatusBadge tone="scheduled">Atrasado</StatusBadge>
                    ) : (
                      <StatusBadge tone={STATUS_TONE[appointment.status]}>{STATUS_LABELS[appointment.status]}</StatusBadge>
                    )}
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
            {data.alerts.professionalsWithoutHours.map((professional) => (
              <Alert key={professional.id} href="/admin/profissionais">
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
  );
}

function Alert({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm transition-colors hover:bg-warning/15 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
      <span>{children}</span>
    </Link>
  );
}
