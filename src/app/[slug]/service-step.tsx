"use client";

import { ServiceCard } from "@/components/service-card";
import { chooseLabel, noneAvailableLabel, othersLabel } from "@/config/vertical";
import { useVertical } from "@/config/vertical-context";

import type { ServiceOption } from "./types";

function groupByCategory(services: ServiceOption[], noCategoryLabel: string): [string, ServiceOption[]][] {
  const groups = new Map<string, ServiceOption[]>();
  for (const service of services) {
    const key = service.categoryName ?? noCategoryLabel;
    const group = groups.get(key) ?? [];
    group.push(service);
    groups.set(key, group);
  }
  // Grupo sem categoria sempre por último, o resto na ordem em que apareceu.
  return Array.from(groups.entries()).sort(([a], [b]) => {
    if (a === noCategoryLabel) return 1;
    if (b === noCategoryLabel) return -1;
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
  const { terms, features } = useVertical();

  if (services.length === 0) {
    return <p className="text-sm text-muted-foreground">{noneAvailableLabel(terms.service)}</p>;
  }

  const noCategoryLabel = othersLabel(terms.service);
  const groups: [string, ServiceOption[]][] = features.serviceCategories
    ? groupByCategory(services, noCategoryLabel)
    : [[noCategoryLabel, services]];
  const hasMultipleGroups = groups.length > 1;

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-medium">{chooseLabel(terms.service)}</h2>
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
                priceType={features.priceFrom ? service.priceType : "FIXED"}
                onSelect={() => onSelect(service)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
