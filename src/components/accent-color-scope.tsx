import { getAccentCssVars } from "@/lib/accent-color";

/**
 * Aplica a cor de marca do negócio em toda a página. As variáveis vão para
 * `:root` (e não só para esta div) porque diálogos, gavetas e toasts são
 * renderizados em portal direto no <body>, fora desta árvore — sem isso eles
 * caíam na cor padrão. Seguro injetar: `getAccentCssVars` só devolve hex
 * normalizado e cores fixas.
 */
export function AccentColorScope({
  accentColor,
  className,
  children,
}: {
  accentColor: string | null | undefined;
  className?: string;
  children: React.ReactNode;
}) {
  const declarations = Object.entries(getAccentCssVars(accentColor) as Record<string, string>)
    .map(([name, value]) => `${name}:${value}`)
    .join(";");

  return (
    <div className={className}>
      <style>{`:root{${declarations}}`}</style>
      {children}
    </div>
  );
}
