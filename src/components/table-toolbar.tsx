import type { ReactNode } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

/**
 * Barra acima de uma `Table` (shadcn) com busca + slot de filtros (Select,
 * Popover de data etc.). Padrão para as telas de lista do admin (Clientes,
 * Financeiro, e futura revisão de Profissionais/Serviços).
 */
export function TableToolbar({
  searchPlaceholder = "Buscar...",
  searchValue,
  onSearchChange,
  filters,
}: {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="pl-8"
        />
      </div>
      {filters ? <div className="flex items-center gap-2">{filters}</div> : null}
    </div>
  );
}
