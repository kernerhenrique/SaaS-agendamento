"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STATUS_LABELS } from "@/lib/appointment-status";
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
        <StatTile label="Agendamentos" value={String(summary.total)} />
        <StatTile label="Taxa de cancelamento" value={formatPercent(summary.cancellationRate)} />
        <StatTile label="Taxa de no-show" value={formatPercent(summary.noShowRate)} />
        <StatTile
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
          <ul className="flex flex-col gap-1 text-sm">
            {Object.entries(summary.byStatus).map(([status, count]) => (
              <li key={status} className="flex justify-between">
                <span>{STATUS_LABELS[status as keyof typeof STATUS_LABELS]}</span>
                <span className="font-medium">{count}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xl font-semibold">{value}</span>
      </CardContent>
    </Card>
  );
}
