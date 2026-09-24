"use client";

import { useCallback, useState } from "react";
import { Clock, Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPriceFromCents } from "@/lib/currency";

import { ServiceFormDialog } from "./service-form-dialog";
import type { ProfessionalOption, ServiceListItem } from "./types";

export function ServicesView({
  initialServices,
  professionals,
}: {
  initialServices: ServiceListItem[];
  professionals: ProfessionalOption[];
}) {
  const [services, setServices] = useState(initialServices);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/admin/services");
    const data = await response.json();
    if (response.ok) setServices(data.services);
  }, []);

  async function handleDelete(service: ServiceListItem) {
    if (!window.confirm(`Remover "${service.name}"? Isso não apaga o histórico de agendamentos.`)) {
      return;
    }
    setDeletingId(service.id);
    try {
      await fetch(`/api/admin/services/${service.id}`, { method: "DELETE" });
      await refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Serviços</h1>
        <ServiceFormDialog
          trigger={
            <Button>
              <Plus />+ Novo serviço
            </Button>
          }
          professionals={professionals}
          onSaved={refresh}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum serviço cadastrado ainda.</p>
        ) : (
          services.map((service) => (
            <Card key={service.id} size="sm">
              <CardHeader>
                <CardTitle className="text-base">{service.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                {service.description ? (
                  <p className="text-muted-foreground">{service.description}</p>
                ) : null}
                <div className="flex gap-1.5">
                  <Badge variant="outline">
                    <Clock className="size-3" />
                    {service.durationMin}min
                  </Badge>
                  <Badge variant="outline">{formatPriceFromCents(service.priceCents)}</Badge>
                </div>
                <p>
                  <span className="font-medium">Profissionais: </span>
                  {service.professionalServices.map((ps) => ps.professional.name).join(", ") || "—"}
                </p>
                <div className="mt-1 flex gap-2">
                  <ServiceFormDialog
                    trigger={
                      <Button variant="outline" size="sm">
                        <Pencil />
                        Editar
                      </Button>
                    }
                    service={service}
                    professionals={professionals}
                    onSaved={refresh}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deletingId === service.id}
                    onClick={() => handleDelete(service)}
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
