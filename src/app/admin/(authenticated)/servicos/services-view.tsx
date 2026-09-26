"use client";

import { useCallback, useState } from "react";
import { Clock, Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { emptyLabel, newLabel } from "@/config/vertical";
import { useVertical } from "@/config/vertical-context";
import { formatPriceFromCents } from "@/lib/currency";

import { ServiceFormDialog } from "./service-form-dialog";
import type { ProfessionalOption, ServiceCategoryOption, ServiceListItem } from "./types";

export function ServicesView({
  initialServices,
  professionals,
  initialCategories,
}: {
  initialServices: ServiceListItem[];
  professionals: ProfessionalOption[];
  initialCategories: ServiceCategoryOption[];
}) {
  const { terms, features } = useVertical();
  const [services, setServices] = useState(initialServices);
  const [categories, setCategories] = useState(initialCategories);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleCategoryCreated(category: ServiceCategoryOption) {
    setCategories((prev) => (prev.some((c) => c.id === category.id) ? prev : [...prev, category]));
  }

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
        <h1 className="text-page-title font-bold">{terms.service.plural}</h1>
        <ServiceFormDialog
          trigger={
            <Button>
              <Plus />
              {newLabel(terms.service)}
            </Button>
          }
          professionals={professionals}
          categories={categories}
          onCategoryCreated={handleCategoryCreated}
          onSaved={refresh}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel(terms.service)}</p>
        ) : (
          services.map((service) => (
            <Card key={service.id} size="sm">
              <CardHeader>
                <CardTitle className="text-base">{service.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                {features.serviceCategories && service.category ? (
                  <Badge variant="secondary" className="w-fit">
                    {service.category.name}
                  </Badge>
                ) : null}
                {service.description ? (
                  <p className="text-muted-foreground">{service.description}</p>
                ) : null}
                <div className="flex gap-1.5">
                  <Badge variant="outline">
                    <Clock className="size-3" />
                    {service.durationMin}min
                  </Badge>
                  <Badge variant="outline">
                    {formatPriceFromCents(service.priceCents)}
                    {features.priceFrom && service.priceType === "FROM" ? "+" : ""}
                  </Badge>
                </div>
                <p>
                  <span className="font-medium">{terms.professional.plural}: </span>
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
                    categories={categories}
                    onCategoryCreated={handleCategoryCreated}
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
