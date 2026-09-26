import { ServiceCard } from "@/components/service-card";

import type { ServiceOption } from "./types";

const NO_CATEGORY_LABEL = "Outros serviços";

function groupByCategory(services: ServiceOption[]): [string, ServiceOption[]][] {
  const groups = new Map<string, ServiceOption[]>();
  for (const service of services) {
    const key = service.categoryName ?? NO_CATEGORY_LABEL;
    const group = groups.get(key) ?? [];
    group.push(service);
    groups.set(key, group);
  }
  // Categoria "Outros" sempre por último, o resto na ordem em que apareceu.
  return Array.from(groups.entries()).sort(([a], [b]) => {
    if (a === NO_CATEGORY_LABEL) return 1;
    if (b === NO_CATEGORY_LABEL) return -1;
    return 0;
  });
}

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

  const groups = groupByCategory(services);
  const hasMultipleGroups = groups.length > 1;

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-medium">Escolha o serviço</h2>
      {groups.map(([categoryName, groupServices]) => (
        <div key={categoryName} className="flex flex-col gap-3">
          {hasMultipleGroups ? (
            <h3 className="text-caption font-medium text-muted-foreground uppercase">{categoryName}</h3>
          ) : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {groupServices.map((service) => (
              <ServiceCard
                key={service.id}
                name={service.name}
                description={service.description}
                durationMin={service.durationMin}
                priceCents={service.priceCents}
                priceType={service.priceType}
                onSelect={() => onSelect(service)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
