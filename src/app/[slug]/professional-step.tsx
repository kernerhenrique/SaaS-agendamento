"use client";

import { Users } from "lucide-react";

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
        {/* Com uma pessoa só, "sem preferência" seria a mesma escolha repetida. */}
        {eligible.length > 1 ? (
          <ProfessionalCard
            name="Sem preferência"
            icon={Users}
            description="Mostramos os horários de todos. Você é atendido por quem estiver livre no horário escolhido."
            onSelect={() => onSelect(NO_PREFERENCE)}
          />
        ) : null}
        {eligible.map((professional) => (
          <ProfessionalCard
            key={professional.id}
            name={professional.name}
            photoUrl={professional.photoUrl}
            specialty={professional.specialty}
            portfolioUrls={features.portfolio ? professional.photoUrls : undefined}
            onSelect={() => onSelect(professional.id)}
          />
        ))}
      </div>
    </div>
  );
}
