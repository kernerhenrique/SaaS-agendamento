"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WEEKDAY_LABELS, minutesToTimeInput } from "@/lib/weekday";

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
        <h1 className="text-xl font-semibold">Profissionais</h1>
        <ProfessionalFormDialog
          trigger={<Button>+ Novo profissional</Button>}
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
                <CardTitle className="text-base">{professional.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                {professional.bio ? <p className="text-muted-foreground">{professional.bio}</p> : null}
                <p>
                  <span className="font-medium">Serviços: </span>
                  {professional.professionalServices.map((ps) => ps.service.name).join(", ") || "—"}
                </p>
                <div>
                  <span className="font-medium">Expediente:</span>
                  <ul className="ml-4 list-disc">
                    {professional.workingHours.map((wh) => (
                      <li key={wh.weekday}>
                        {WEEKDAY_LABELS[wh.weekday]}: {minutesToTimeInput(wh.startMinute)}–
                        {minutesToTimeInput(wh.endMinute)}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-2 flex gap-2">
                  <ProfessionalFormDialog
                    trigger={
                      <Button variant="outline" size="sm">
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
