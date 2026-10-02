import Link from "next/link";
import { ExternalLink, Sparkles } from "lucide-react";

/**
 * Faixa do painel numa demonstração: deixa claro que os dados são de exemplo
 * e voltam ao original toda madrugada, e leva de volta à página de reservas
 * (para o visitante reservar e ver chegar na agenda).
 */
export function DemoBanner({ slug }: { slug: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b bg-muted px-4 py-2 text-sm text-muted-foreground sm:px-6">
      <p className="flex items-center gap-2">
        <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
        <span>
          <strong className="font-medium text-foreground">Você está numa demonstração.</strong> Mexa à vontade: os dados voltam
          ao original toda madrugada.
        </span>
      </p>
      <Link href={`/${slug}`} target="_blank" className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline">
        Página de reservas
        <ExternalLink className="size-3.5" aria-hidden />
        <span className="sr-only">(abre em nova aba)</span>
      </Link>
    </div>
  );
}
