import { LayoutDashboard, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BRAND } from "@/config/brand";

/**
 * Faixa no topo da página pública de uma demonstração: explica o que é e leva
 * ao painel sem senha (POST para /api/public/demo/{slug}/entrar, que só
 * funciona em negócio de demonstração). Formulário comum: funciona sem JS.
 */
export function DemoBar({ slug }: { slug: string }) {
  return (
    <div className="border-b bg-muted">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>
            <strong className="font-medium text-foreground">Demonstração da {BRAND.name}.</strong> Faça uma reserva de teste e
            veja como ela chega no painel.
          </span>
        </p>
        <form action={`/api/public/demo/${slug}/entrar`} method="post" className="shrink-0">
          <Button type="submit" size="sm" className="w-full sm:w-auto">
            <LayoutDashboard aria-hidden />
            Ver o painel da demonstração
          </Button>
        </form>
      </div>
    </div>
  );
}
