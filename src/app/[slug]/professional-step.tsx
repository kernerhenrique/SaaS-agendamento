import { Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { getInitials } from "@/lib/text";

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
            photoUrl={professional.photoUrl}
            onSelect={() => onSelect(professional.id)}
          />
        ))}
      </div>
    </div>
  );
}

function SelectableCard({
  label,
  photoUrl,
  onSelect,
}: {
  label: string;
  photoUrl?: string | null;
  onSelect: () => void;
}) {
  return (
    <Card
      size="sm"
      role="button"
      tabIndex={0}
      className="cursor-pointer transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onSelect();
      }}
    >
      <CardContent className="flex items-center gap-3">
        {photoUrl !== undefined ? (
          <Avatar>
            <AvatarImage src={photoUrl ?? undefined} alt="" />
            <AvatarFallback>{getInitials(label)}</AvatarFallback>
          </Avatar>
        ) : (
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Users className="size-4" />
          </div>
        )}
        <p className="font-medium">{label}</p>
      </CardContent>
    </Card>
  );
}
