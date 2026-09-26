/**
 * Paleta fixa de cores de profissional (agenda, cards, perfil). O banco grava
 * só a chave (Professional.color); a cor vem dos tokens --pro-* em
 * globals.css. Classes escritas por extenso para o Tailwind encontrá-las.
 */
export const PROFESSIONAL_COLORS = [
  { key: "blue", label: "Azul", dotClass: "bg-pro-blue", borderClass: "border-pro-blue" },
  { key: "violet", label: "Violeta", dotClass: "bg-pro-violet", borderClass: "border-pro-violet" },
  { key: "pink", label: "Rosa", dotClass: "bg-pro-pink", borderClass: "border-pro-pink" },
  { key: "orange", label: "Laranja", dotClass: "bg-pro-orange", borderClass: "border-pro-orange" },
  { key: "amber", label: "Âmbar", dotClass: "bg-pro-amber", borderClass: "border-pro-amber" },
  { key: "green", label: "Verde", dotClass: "bg-pro-green", borderClass: "border-pro-green" },
  { key: "teal", label: "Turquesa", dotClass: "bg-pro-teal", borderClass: "border-pro-teal" },
  { key: "slate", label: "Grafite", dotClass: "bg-pro-slate", borderClass: "border-pro-slate" },
] as const;

export type ProfessionalColorKey = (typeof PROFESSIONAL_COLORS)[number]["key"];

export function isProfessionalColorKey(value: unknown): value is ProfessionalColorKey {
  return PROFESSIONAL_COLORS.some((color) => color.key === value);
}

/** Cor escolhida, ou null quando não há (ou a chave gravada não existe mais). */
export function getProfessionalColor(key: string | null | undefined) {
  return PROFESSIONAL_COLORS.find((color) => color.key === key) ?? null;
}
