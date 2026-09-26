import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

/**
 * Card de KPI usado em dashboards (Início, Relatórios). Extraído do
 * `StatTile` local de `relatorios/reports-view.tsx` — ao adotar este
 * componente lá, remover a duplicata local.
 */
export function KpiCard({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <Card size="sm" className={className}>
      <CardContent className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="size-3.5" />
          <span className="text-caption">{label}</span>
        </div>
        <span className="text-page-title font-bold">{value}</span>
      </CardContent>
    </Card>
  );
}
