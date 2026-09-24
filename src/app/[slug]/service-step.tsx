import { Card, CardContent } from "@/components/ui/card";
import { formatPriceFromCents } from "@/lib/currency";

import type { ServiceOption } from "./types";

export function ServiceStep({
  services,
  onSelect,
}: {
  services: ServiceOption[];
  onSelect: (service: ServiceOption) => void;
}) {
  if (services.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum serviço disponível no momento.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">Escolha o serviço</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {services.map((service) => (
          <Card
            key={service.id}
            size="sm"
            role="button"
            tabIndex={0}
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => onSelect(service)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onSelect(service);
            }}
          >
            <CardContent className="flex flex-col gap-1">
              <p className="font-medium">{service.name}</p>
              {service.description ? (
                <p className="text-sm text-muted-foreground">{service.description}</p>
              ) : null}
              <p className="text-sm">
                {service.durationMin}min · {formatPriceFromCents(service.priceCents)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
