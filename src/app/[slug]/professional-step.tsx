import { Card, CardContent } from "@/components/ui/card";

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
  const eligible = professionals.filter((professional) => professional.serviceIds.includes(serviceId));

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">Escolha o profissional</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SelectableCard label="Sem preferência" onSelect={() => onSelect(NO_PREFERENCE)} />
        {eligible.map((professional) => (
          <SelectableCard
            key={professional.id}
            label={professional.name}
            onSelect={() => onSelect(professional.id)}
          />
        ))}
      </div>
    </div>
  );
}

function SelectableCard({ label, onSelect }: { label: string; onSelect: () => void }) {
  return (
    <Card
      size="sm"
      role="button"
      tabIndex={0}
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onSelect();
      }}
    >
      <CardContent>
        <p className="font-medium">{label}</p>
      </CardContent>
    </Card>
  );
}
