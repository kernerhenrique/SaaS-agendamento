"use client";

import { useState } from "react";
import { CalendarClock, Trophy, UserX, XCircle, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STATUS_BADGE_CLASSES, STATUS_LABELS } from "@/lib/appointment-status";
import type { AppointmentStatus } from "@/generated/prisma/enums";
import type { ReportSummary } from "@/server/modules/report/report.service";
import { cn } from "cn";

import { ChartCard, DailyColumnChart, DataTable, HorizontalBarChart } from "./report-charts";

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDate(dateISO: string): string {
  const [year, month, day] = dateISO.split("-");
  return `${day}/${month}/${year}`;
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <Badge variant="outline" className={STATUS_BADGE_CLASSES[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function ReportsView({
  initialSummary,
  startDate,
  endDate,
}: {
  initialSummary: ReportSummary;
  startDate: string;
  endDate: string;
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApply() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/reports?startDate=${start}&endDate=${end}`);
      const data = await response.json();
      if (response.ok) setSummary(data.summary);
      else setError(data.error ?? "Não foi possível carregar o relatório");
    } catch {
      setError("Não foi possível carregar o relatório");
    } finally {
      setIsLoading(false);
    }
  }

  const statusEntries = Object.entries(summary.byStatus) as [AppointmentStatus, number][];

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Relatórios</h1>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="startDate">De</Label>
          <Input id="startDate" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="endDate">Até</Label>
          <Input id="endDate" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <Button variant="outline" onClick={handleApply} disabled={isLoading}>
          {isLoading ? "Carregando..." : "Aplicar"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {/* Mantém o conteúdo anterior visível (esmaecido) durante a recarga, sem "piscar". */}
      <div className={cn("flex flex-col gap-6 transition-opacity", isLoading && "opacity-60")}>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile icon={CalendarClock} label="Agendamentos" value={String(summary.total)} />
          <StatTile icon={XCircle} label="Taxa de cancelamento" value={formatPercent(summary.cancellationRate)} />
          <StatTile icon={UserX} label="Taxa de no-show" value={formatPercent(summary.noShowRate)} />
          <StatTile
            icon={Trophy}
            label="Profissional mais requisitado"
            value={
              summary.mostRequestedProfessional
                ? `${summary.mostRequestedProfessional.name} (${summary.mostRequestedProfessional.count})`
                : "—"
            }
          />
        </div>

        <ChartCard
          title="Agendamentos por dia"
          chart={<DailyColumnChart data={summary.byDay} />}
          table={
            <DataTable
              columns={["Data", "Agendamentos"]}
              rows={summary.byDay.map((day) => [formatDate(day.date), day.count])}
            />
          }
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard
            title="Agendamentos por profissional"
            chart={
              summary.byProfessional.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nenhum agendamento no período.</p>
              ) : (
                <HorizontalBarChart
                  rows={summary.byProfessional.map((p) => ({
                    key: p.professionalId,
                    label: p.name,
                    value: p.count,
                  }))}
                />
              )
            }
            table={
              <DataTable
                columns={["Profissional", "Agendamentos"]}
                rows={summary.byProfessional.map((p) => [p.name, p.count])}
              />
            }
          />

          <ChartCard
            title="Agendamentos por status"
            chart={
              <HorizontalBarChart
                rows={statusEntries.map(([status, count]) => ({
                  key: status,
                  label: <StatusBadge status={status} />,
                  value: count,
                }))}
              />
            }
            table={
              <DataTable
                columns={["Status", "Agendamentos"]}
                rows={statusEntries.map(([status, count]) => [STATUS_LABELS[status], count])}
              />
            }
          />
        </div>
      </div>
    </main>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="size-3.5" />
          <span className="text-xs">{label}</span>
        </div>
        <span className="text-2xl font-bold">{value}</span>
      </CardContent>
    </Card>
  );
}
