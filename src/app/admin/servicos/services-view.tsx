"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { ServiceFormDialog } from "./service-form-dialog";
import type { ProfessionalOption, ServiceListItem } from "./types";

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

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
        <h1 className="text-xl font-semibold">Serviços</h1>
        <ServiceFormDialog
          trigger={<Button>+ Novo serviço</Button>}
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
              <CardContent className="flex flex-col gap-2 text-sm">
                {service.description ? (
                  <p className="text-muted-foreground">{service.description}</p>
                ) : null}
                <p>
                  {service.durationMin}min · {formatPrice(service.priceCents)}
                </p>
                <p>
                  <span className="font-medium">Profissionais: </span>
                  {service.professionalServices.map((ps) => ps.professional.name).join(", ") || "—"}
                </p>
                <div className="mt-2 flex gap-2">
                  <ServiceFormDialog
                    trigger={
                      <Button variant="outline" size="sm">
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
