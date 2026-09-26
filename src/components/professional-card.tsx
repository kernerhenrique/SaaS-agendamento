import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SelectableCard } from "@/components/selectable-card";
import { getInitials } from "@/lib/text";

/**
 * Extraído do `SelectableCard` inline de `src/app/[slug]/professional-step.tsx`.
 * O campo "especialidade" pedido no design system não existe hoje como coluna
 * própria em `Professional` — usamos `bio` (texto livre) como aproximação até
 * essa decisão de schema ser tomada.
 */
export function ProfessionalCard({
  name,
  photoUrl,
  specialty,
  onSelect,
}: {
  name: string;
  photoUrl?: string | null;
  specialty?: string | null;
  onSelect: () => void;
}) {
  return (
    <SelectableCard onSelect={onSelect}>
      <div className="flex flex-row items-center gap-3">
        <Avatar>
          <AvatarImage src={photoUrl ?? undefined} alt="" />
          <AvatarFallback>{getInitials(name)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <p className="font-medium">{name}</p>
          {specialty ? <p className="text-caption text-muted-foreground">{specialty}</p> : null}
        </div>
      </div>
    </SelectableCard>
  );
}
