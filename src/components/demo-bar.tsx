import { LayoutDashboard, MessageCircle, Sparkles } from "lucide-react";

import { DemoWhatsAppLink } from "@/components/demo-whatsapp-link";
import { Button, buttonVariants } from "@/components/ui/button";
import { BRAND } from "@/config/brand";

/**
 * Faixa no topo da página pública de uma demonstração: explica o que é e leva
 * ao painel sem senha (POST para /api/public/demo/{slug}/entrar, que só
 * funciona em negócio de demonstração). Formulário comum: funciona sem JS.
 * Ao lado, o WhatsApp de vendas da Aprazzo para quem quiser conversar.
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
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <form action={`/api/public/demo/${slug}/entrar`} method="post">
            <Button type="submit" size="sm" className="w-full sm:w-auto">
              <LayoutDashboard aria-hidden />
              Ver o painel da demonstração
            </Button>
          </form>
          <DemoWhatsAppLink section="demo-pagina" className={buttonVariants({ variant: "outline", size: "sm", className: "w-full sm:w-auto" })}>
            <MessageCircle aria-hidden />
            Falar com a {BRAND.name}
          </DemoWhatsAppLink>
        </div>
      </div>
    </div>
  );
}
