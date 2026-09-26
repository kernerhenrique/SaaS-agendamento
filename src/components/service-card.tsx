import { Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SelectableCard } from "@/components/selectable-card";
import { formatPriceFromCents } from "@/lib/currency";

/**
 * Extraído do card inline de `src/app/[slug]/service-step.tsx`, para reuso
 * também em telas do admin (ex.: seletor de serviço no dialog de novo
 * agendamento). Categoria é usada para agrupar (não exibida no próprio card).
 */
export function ServiceCard({
  name,
  description,
  durationMin,
  priceCents,
  priceType = "FIXED",
  onSelect,
}: {
  name: string;
  description?: string | null;
  durationMin: number;
  priceCents: number;
  priceType?: "FIXED" | "FROM";
  onSelect: () => void;
}) {
  return (
    <SelectableCard onSelect={onSelect}>
      <p className="text-base font-semibold">{name}</p>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      <div className="flex gap-1.5">
        <Badge variant="outline">
          <Clock className="size-3" />
          {durationMin}min
        </Badge>
        <Badge variant="outline">
          {formatPriceFromCents(priceCents)}
          {priceType === "FROM" ? "+" : ""}
        </Badge>
      </div>
    </SelectableCard>
  );
}
