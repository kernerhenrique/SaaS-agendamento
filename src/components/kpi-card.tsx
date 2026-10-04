import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "cn";

export interface KpiDelta {
  /**
   * Variação em relação ao período anterior. "relative": fração (0.12 = +12%),
   * null quando o anterior era 0. "points": diferença em pontos percentuais de
   * uma taxa (0.05 = +5 p.p.).
   */
  value: number | null;
  kind?: "relative" | "points";
  /** Taxas em que subir é ruim (faltas, cancelamento): as cores se invertem. */
  higherIsBetter?: boolean;
}

const percentFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

/**
 * Card de KPI usado em dashboards (Início, Financeiro, Relatórios). Com
 * `delta`, mostra a comparação com o período anterior ("▲ 12% vs. período
 * anterior") em verde/vermelho conforme o que é bom para o negócio.
 */
export function KpiCard({
  icon: Icon,
  label,
  value,
  delta,
  hint,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  delta?: KpiDelta;
  /** Como o número é calculado, em poucas palavras (ex.: "por atendimento concluído"). */
  hint?: string;
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
        {hint ? <span className="text-caption text-muted-foreground">{hint}</span> : null}
        {delta ? <DeltaLine delta={delta} /> : null}
      </CardContent>
    </Card>
  );
}

function DeltaLine({ delta }: { delta: KpiDelta }) {
  if (delta.value == null) {
    return <span className="text-caption text-muted-foreground">Sem base no período anterior</span>;
  }
  const points = delta.kind === "points";
  const magnitude = percentFormat.format(Math.abs(delta.value * 100));
  if (magnitude === "0") {
    return <span className="text-caption text-muted-foreground">Estável vs. período anterior</span>;
  }
  const up = delta.value > 0;
  const good = up === (delta.higherIsBetter ?? true);
  const text = `${magnitude}${points ? " p.p." : "%"}`;
  return (
    <span className={cn("text-caption", good ? "text-success" : "text-destructive")}>
      <span aria-hidden>{up ? "▲" : "▼"} </span>
      <span className="sr-only">{up ? "Subiu " : "Caiu "}</span>
      {text} <span className="text-muted-foreground">vs. período anterior</span>
    </span>
  );
}
