"use client";

import { ProfessionalCard } from "@/components/professional-card";
import { chooseLabel } from "@/config/vertical";
import { useVertical } from "@/config/vertical-context";

import { NO_PREFERENCE, type ProfessionalOption } from "./types";

export function ProfessionalStep({
  professionals,
  serviceId,
  onSelect,
}: {
  professionals: ProfessionalOption[];
  serviceId: string;
  onSelect: (professionalId: string | typeof NO_PREFERENCE) => void;
}) {
  const { terms, features } = useVertical();
  const eligible = professionals.filter((professional) => professional.serviceIds.includes(serviceId));

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">{chooseLabel(terms.professional)}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ProfessionalCard name="Sem preferência" onSelect={() => onSelect(NO_PREFERENCE)} />
        {eligible.map((professional) => (
          <ProfessionalCard
            key={professional.id}
            name={professional.name}
            photoUrl={professional.photoUrl}
            specialty={professional.specialty ?? professional.bio}
            portfolioUrls={features.portfolio ? professional.photoUrls : undefined}
            onSelect={() => onSelect(professional.id)}
          />
        ))}
      </div>
    </div>
  );
}
