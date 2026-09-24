// "admin" é reservado porque o painel do negócio vive em /admin/*, uma rota
// real (não um route group) para não colidir com a página pública /{slug}.
// "api" é reservado pelo próprio Next.js (rotas de API).
export const RESERVED_SLUGS = ["admin", "api"] as const;

export function isReservedSlug(slug: string): boolean {
  return (RESERVED_SLUGS as readonly string[]).includes(slug.toLowerCase());
}
