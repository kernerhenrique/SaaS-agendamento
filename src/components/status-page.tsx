import type { ReactNode } from "react";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Página de aviso (endereço que não existe, link vencido, convite usado): logo da
 * Aprazzo, um título de verdade (h1), o que aconteceu em linguagem simples e um
 * caminho para sair. Sem isso a pessoa via uma frase solta numa tela vazia.
 */
export function StatusPage({
  title,
  children,
  action,
  secondary,
}: {
  title: string;
  children: ReactNode;
  /** Botão principal: `{ href, label }`. */
  action?: { href: string; label: string };
  /** Link de texto abaixo do botão. */
  secondary?: { href: string; label: string };
}) {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-5 text-center">
        <Link href="/" aria-label="Aprazzo, página inicial" className="rounded-md">
          <BrandLogo />
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-page-title font-bold tracking-tight text-balance">{title}</h1>
          <div className="text-muted-foreground">{children}</div>
        </div>
        {action ? (
          <Link href={action.href} className={cn(buttonVariants(), "w-full sm:w-auto")}>
            {action.label}
          </Link>
        ) : null}
        {secondary ? (
          <Link href={secondary.href} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            {secondary.label}
          </Link>
        ) : null}
      </div>
    </main>
  );
}
