// "admin" é reservado porque o painel do negócio vive em /admin/*, uma rota
// real (não um route group) para não colidir com a página pública /{slug}.
// "api" é reservado pelo próprio Next.js (rotas de API); "agendamento" é a
// rota do link de gerenciar. O resto fica livre para páginas da Aprazzo
// (vendas, preços, termos…) sem disputar endereço com um negócio.
export const RESERVED_SLUGS = [
  "admin",
  "api",
  "agendamento",
  "precos",
  "contato",
  "termos",
  "privacidade",
  "entrar",
  "cadastro",
  "ajuda",
  "blog",
  "app",
] as const;

export function isReservedSlug(slug: string): boolean {
  return (RESERVED_SLUGS as readonly string[]).includes(slug.toLowerCase());
}

/** Endereço do negócio (`aprazzo.com.br/{slug}`): minúsculas, números e hífen, sem hífen nas pontas. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_LENGTH = { min: 3, max: 50 } as const;
