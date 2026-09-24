"use client";

import { useState } from "react";
import { CalendarClock, Trophy, UserX, XCircle, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STATUS_BADGE_CLASSES, STATUS_LABELS } from "@/lib/appointment-status";
import type { ReportSummary } from "@/server/modules/report/report.service";

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
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

  async function handleApply() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/reports?startDate=${start}&endDate=${end}`);
      const data = await response.json();
      if (response.ok) setSummary(data.summary);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Relatórios</h1>

      <div className="flex items-end gap-4">
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
      </div>

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

      <Card size="sm" className="max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Agendamentos por status</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2 text-sm">
            {Object.entries(summary.byStatus).map(([status, count]) => (
              <li key={status} className="flex items-center justify-between">
                <Badge variant="outline" className={STATUS_BADGE_CLASSES[status as keyof typeof STATUS_LABELS]}>
                  {STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
                </Badge>
                <span className="font-medium">{count}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
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
