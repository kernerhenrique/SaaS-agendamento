import { BRAND } from "@/config/brand";
import { cn } from "cn";

/**
 * Logo do produto (Aprazzo) na versão certa para o tema: a de fundo claro tem
 * o nome em `ink` e sumiria no escuro. As duas vêm do design system; a troca
 * é só por CSS (sem piscar na hidratação).
 */
export function BrandLogo({ className }: { className?: string }) {
  if (!BRAND.logoPath) return null;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG da marca em /public, dimensões pelo viewBox */}
      <img src={BRAND.logoPath} alt={BRAND.name} className={cn("h-9 w-auto", BRAND.logoDarkPath && "dark:hidden", className)} />
      {BRAND.logoDarkPath ? (
        // eslint-disable-next-line @next/next/no-img-element -- SVG da marca em /public, dimensões pelo viewBox
        <img src={BRAND.logoDarkPath} alt={BRAND.name} className={cn("hidden h-9 w-auto dark:block", className)} />
      ) : null}
    </>
  );
}
