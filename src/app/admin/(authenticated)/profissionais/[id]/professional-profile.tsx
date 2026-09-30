"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  CalendarPlus,
  CalendarX,
  ChevronLeft,
  Gauge,
  HandCoins,
  Trash2,
  UserX,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { useAdminShell } from "@/components/admin/admin-shell-context";
import { ProfessionalAvatar } from "@/components/admin/professional-avatar";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lowerTerm } from "@/config/vertical";
import { useVertical } from "@/config/vertical-context";
import type { AppointmentStatus } from "@/generated/prisma/enums";
import { STATUS_LABELS, STATUS_TONE } from "@/lib/appointment-status";
import { formatPriceFromCents } from "@/lib/currency";
import { formatDateLabel } from "@/lib/date";

import { StaffAccessCard } from "@/components/admin/staff-access-card";

import { ProfessionalForm } from "../professional-form";
import type { ProfessionalListItem, ServiceOption } from "../types";

interface UpcomingItem {
  id: string;
  status: AppointmentStatus;
  startAt: string;
  endAt: string;
  clientName: string;
  serviceName: string;
}

interface MonthStats {
  startDate: string;
  appointments: number;
  completed: number;
  noShows: number;
  noShowRate: number | null;
  occupancyRate: number | null;
  receivedCents: number;
  commissionCents: number;
}

const formatPercent = (rate: number | null) =>
  rate == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0 }).format(rate);

export function ProfessionalProfile({
  professional,
  upcoming,
  month,
  services,
  timezone,
}: {
  professional: ProfessionalListItem;
  upcoming: UpcomingItem[];
  month: MonthStats;
  services: ServiceOption[];
  timezone: string;
}) {
  const { terms, features } = useVertical();
  const router = useRouter();
  const { openNewAppointment } = useAdminShell();
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const formatTime = (iso: string) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  const localDate = (iso: string) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
      new Date(iso),
    );
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" }).format(
    new Date(`${month.startDate}T12:00:00Z`),
  );

  // Próximos agrupados por dia, na ordem em que chegam (já ordenados por horário).
  const upcomingByDay = new Map<string, UpcomingItem[]>();
  for (const item of upcoming) {
    const day = localDate(item.startAt);
    upcomingByDay.set(day, [...(upcomingByDay.get(day) ?? []), item]);
  }

  async function remove() {
    setIsRemoving(true);
    try {
      const response = await fetch(`/api/admin/professionals/${professional.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error ?? "Não foi possível remover");
        return;
      }
      toast.success("Cadastro removido.");
      router.push("/admin/profissionais");
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3">
        <Link
          href="/admin/profissionais"
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          {terms.professional.plural}
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <ProfessionalAvatar
            name={professional.name}
            photoUrl={professional.photoUrl}
            color={professional.color}
            size="lg"
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <h1 className="flex items-center gap-2 text-page-title font-bold">
              <span className="truncate">{professional.name}</span>
              {!professional.active ? <Badge variant="outline">Inativo</Badge> : null}
            </h1>
            {professional.specialty ? <p className="text-sm text-muted-foreground">{professional.specialty}</p> : null}
          </div>
          {professional.active ? (
            // No celular o botão desce para a linha de baixo (o nome não é cortado).
            <Button className="w-full sm:w-auto" onClick={() => openNewAppointment({ professionalId: professional.id })}>
              <CalendarPlus />
              Novo agendamento
            </Button>
          ) : null}
        </div>
      </div>

      <Tabs defaultValue="proximos">
        <TabsList>
          <TabsTrigger value="proximos">Próximos</TabsTrigger>
          <TabsTrigger value="desempenho">Desempenho</TabsTrigger>
          <TabsTrigger value="dados">Dados</TabsTrigger>
        </TabsList>

        <TabsContent value="proximos" className="pt-4">
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarX}
              title="Nada marcado daqui para frente"
              action={
                professional.active ? (
                  <Button size="sm" variant="outline" onClick={() => openNewAppointment({ professionalId: professional.id })}>
                    <CalendarPlus />
                    Novo agendamento
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="flex max-w-2xl flex-col gap-5">
              {[...upcomingByDay.entries()].map(([day, items]) => (
                <section key={day} className="flex flex-col gap-2">
                  <h2 className="text-sm font-semibold first-letter:uppercase">{formatDateLabel(day, timezone)}</h2>
                  <ul className="flex flex-col gap-2">
                    {items.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={`/admin/agenda?date=${day}`}
                          className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm shadow-sm transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                          <span className="w-24 shrink-0 font-semibold tabular-nums">
                            {formatTime(item.startAt)}–{formatTime(item.endAt)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{item.clientName}</span>
                            <span className="block truncate text-caption text-muted-foreground">{item.serviceName}</span>
                          </span>
                          <StatusBadge tone={STATUS_TONE[item.status]}>{STATUS_LABELS[item.status]}</StatusBadge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="desempenho" className="flex flex-col gap-3 pt-4">
          <p className="text-sm text-muted-foreground">
            Mês de {monthLabel}, incluindo o que já está marcado até o fim do mês.
          </p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard icon={CalendarCheck} label="Agendamentos" value={String(month.appointments)} />
            <KpiCard icon={CalendarCheck} label="Concluídos" value={String(month.completed)} />
            <KpiCard
              icon={UserX}
              label="Faltas"
              value={month.noShows > 0 ? `${month.noShows} (${formatPercent(month.noShowRate)})` : "0"}
            />
            <KpiCard icon={Gauge} label="Ocupação" value={formatPercent(month.occupancyRate)} />
            <KpiCard icon={Wallet} label="Recebido no mês" value={formatPriceFromCents(month.receivedCents)} />
            {features.commissions ? (
              <KpiCard
                icon={HandCoins}
                label={`Comissão do mês${professional.commissionPercent != null ? ` (atual ${professional.commissionPercent}%)` : ""}`}
                value={formatPriceFromCents(month.commissionCents)}
              />
            ) : null}
          </div>
          <p className="text-caption text-muted-foreground">
            Ocupação = minutos agendados ÷ minutos de expediente do mês (sem intervalo e bloqueios). Recebido e comissão
            contam pela data de recebimento, com a % que valia em cada pagamento.
          </p>
        </TabsContent>

        <TabsContent value="dados" className="flex flex-col gap-10 pt-4">
          <ProfessionalForm
            professional={professional}
            services={services}
            timezone={timezone}
            onSaved={() => {
              toast.success("Cadastro salvo.");
              router.refresh();
            }}
          />

          <StaffAccessCard professionalId={professional.id} professionalName={professional.name} />

          <section className="flex max-w-2xl flex-col gap-2 rounded-lg border border-destructive/30 p-4">
            <h2 className="text-sm font-semibold">Remover cadastro</h2>
            <p className="text-sm text-muted-foreground">
              Para só pausar, desligue “Ativo” acima. Remover tira {lowerTerm(terms.professional.singular)} das listas de vez;
              o histórico de agendamentos continua nos relatórios.
            </p>
            <Button variant="outline" size="sm" className="w-fit" onClick={() => setIsConfirmingRemove(true)}>
              <Trash2 />
              Remover
            </Button>
          </section>
        </TabsContent>
      </Tabs>

      <Dialog open={isConfirmingRemove} onOpenChange={setIsConfirmingRemove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover {professional.name}?</DialogTitle>
            <DialogDescription>
              Não dá para desfazer pelo painel. Agendamentos já feitos continuam no histórico.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmingRemove(false)}>
              Voltar
            </Button>
            <Button variant="destructive" disabled={isRemoving} onClick={() => void remove()}>
              {isRemoving ? "Removendo…" : "Remover cadastro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
