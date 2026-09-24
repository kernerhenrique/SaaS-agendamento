"use client";

import { useCallback, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "cn";
import { getInitials } from "@/lib/text";
import { WEEKDAY_LABELS, WEEKDAY_ORDER, minutesToTimeInput } from "@/lib/weekday";

import { ProfessionalFormDialog } from "./professional-form-dialog";
import type { ProfessionalListItem, ServiceOption } from "./types";

export function ProfessionalsView({
  initialProfessionals,
  services,
  timezone,
}: {
  initialProfessionals: ProfessionalListItem[];
  services: ServiceOption[];
  timezone: string;
}) {
  const [professionals, setProfessionals] = useState(initialProfessionals);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/admin/professionals");
    const data = await response.json();
    if (response.ok) setProfessionals(data.professionals);
  }, []);

  async function handleDelete(professional: ProfessionalListItem) {
    if (!window.confirm(`Remover "${professional.name}"? Isso não apaga o histórico de agendamentos.`)) {
      return;
    }
    setDeletingId(professional.id);
    try {
      await fetch(`/api/admin/professionals/${professional.id}`, { method: "DELETE" });
      await refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Profissionais</h1>
        <ProfessionalFormDialog
          trigger={
            <Button>
              <Plus />+ Novo profissional
            </Button>
          }
          services={services}
          timezone={timezone}
          onSaved={refresh}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {professionals.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum profissional cadastrado ainda.</p>
        ) : (
          professionals.map((professional) => (
            <Card key={professional.id} size="sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={professional.photoUrl ?? undefined} alt="" />
                    <AvatarFallback>{getInitials(professional.name)}</AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-base">{professional.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                {professional.bio ? <p className="text-muted-foreground">{professional.bio}</p> : null}
                <p>
                  <span className="font-medium">Serviços: </span>
                  {professional.professionalServices.map((ps) => ps.service.name).join(", ") || "—"}
                </p>
                <WeeklyMiniGrid workingHours={professional.workingHours} />
                <div className="mt-1 flex gap-2">
                  <ProfessionalFormDialog
                    trigger={
                      <Button variant="outline" size="sm">
                        <Pencil />
                        Editar
                      </Button>
                    }
                    professional={professional}
                    services={services}
                    timezone={timezone}
                    onSaved={refresh}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deletingId === professional.id}
                    onClick={() => handleDelete(professional)}
                  >
                    <Trash2 />
                    Remover
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}

function WeeklyMiniGrid({
  workingHours,
}: {
  workingHours: ProfessionalListItem["workingHours"];
}) {
  const byWeekday = new Map(workingHours.map((wh) => [wh.weekday, wh]));

  return (
    <div>
      <span className="font-medium">Expediente</span>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {WEEKDAY_ORDER.map((weekday) => {
          const wh = byWeekday.get(weekday);
          const label = WEEKDAY_LABELS[weekday];
          return (
            <div
              key={weekday}
              title={
                wh
                  ? `${label}: ${minutesToTimeInput(wh.startMinute)}–${minutesToTimeInput(wh.endMinute)}`
                  : `${label}: fechado`
              }
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-md py-1.5 text-[0.65rem] font-medium",
                wh ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
              )}
            >
              <span>{label.slice(0, 1)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
