/**
 * Marca do produto (a plataforma que é vendida), não a do negócio cliente.
 * Design system da marca: https://claude.ai/artifact/5EVQG5BRicTfK4M4X5AKNB
 * (tokens em globals.css, fontes em app/layout.tsx). Aparece no login, no
 * convite, no título do painel, no rodapé "Agendamento por" da página
 * pública e nos arquivos .ics. O nome é sempre "Aprazzo" (A maiúsculo).
 */
export const BRAND = {
  name: "Aprazzo",
  shortName: "Aprazzo",
  tagline: "Agendamento e gestão para negócios com equipe",
  /** Logo horizontal em /public para fundos claros; null usa o ícone padrão. */
  logoPath: "/brand/aprazzo-logo.svg" as string | null,
  /** Mesmo logo para fundos escuros (tema escuro). */
  logoDarkPath: "/brand/aprazzo-logo-dark.svg" as string | null,
  /** Capa da tela de login (painel lateral no desktop). */
  coverPath: "/brand/aprazzo-capa-1920x1080.png",
  /** Prévia de link (Open Graph) das páginas do produto. */
  ogImagePath: "/brand/aprazzo-capa-1200x630.png",
  poweredByLabel: "Agendamento por",
  /** Identificador técnico (uid/PRODID de .ics). Sem espaços. */
  slug: "aprazzo",
} as const;

/**
 * Dados das páginas /termos e /privacidade. Razão social e CNPJ ficam null até
 * a empresa existir: as páginas só mostram a linha quando preenchidos.
 * Atualize `updatedAt` sempre que mudar o texto das páginas.
 */
export const LEGAL = {
  companyName: null as string | null,
  cnpj: null as string | null,
  /** Canal oficial para dúvidas e pedidos sobre dados (LGPD). Só dígitos, com DDD. */
  contactWhatsapp: "27996950409",
  updatedAt: "3 de outubro de 2026",
} as const;
