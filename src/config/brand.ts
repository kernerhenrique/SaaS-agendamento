/**
 * Marca do produto (a plataforma que é vendida), não a do negócio cliente.
 * Placeholder até a identidade visual existir: trocar nome/logo aqui (e os
 * tokens em globals.css) aplica a marca em login, título do painel, rodapé
 * "feito com" da página pública e arquivos .ics.
 */
export const BRAND = {
  name: "Agendamento online",
  shortName: "Agendamento",
  tagline: "Agenda online para negócios com equipe",
  /** Caminho em /public; null usa o ícone padrão. */
  logoPath: null as string | null,
  poweredByLabel: "Feito com",
  /** Identificador técnico (uid/PRODID de .ics). Sem espaços. */
  slug: "agendamento-online",
} as const;
