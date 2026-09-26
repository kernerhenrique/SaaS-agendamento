import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Base de card clicável (seleção de serviço/profissional/horário etc.) — o
 * hover/foco padrão do fluxo de reserva, extraído para reuso.
 */
export function SelectableCard({
  onSelect,
  className,
  children,
}: {
  onSelect: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card
      size="sm"
      role="button"
      tabIndex={0}
      className={cn("cursor-pointer transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg", className)}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onSelect();
      }}
    >
      <CardContent className="flex flex-col gap-2">{children}</CardContent>
    </Card>
  );
}
