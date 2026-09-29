import type { CSSProperties } from "react";

export const DEFAULT_ACCENT_COLOR = "#4F46E5";

const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

function normalizeHex(hex: string): string | null {
  const trimmed = hex.trim();
  if (!HEX_PATTERN.test(trimmed)) return null;

  const withoutHash = trimmed.replace("#", "");
  const expanded =
    withoutHash.length === 3
      ? withoutHash
          .split("")
          .map((char) => char + char)
          .join("")
      : withoutHash;

  return `#${expanded.toLowerCase()}`;
}

/** Luminância relativa (WCAG), usada para decidir se o texto sobre a cor deve ser claro ou escuro. */
function relativeLuminance(hex6: string): number {
  const [r, g, b] = [0, 2, 4].map((offset) => {
    const channel = parseInt(hex6.slice(1 + offset, 3 + offset), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Resolve um `accentColor` de negócio para um hex válido, com fallback para o padrão do produto. */
export function resolveAccentColor(accentColor: string | null | undefined): string {
  if (!accentColor) return DEFAULT_ACCENT_COLOR;
  return normalizeHex(accentColor) ?? DEFAULT_ACCENT_COLOR;
}

// Luminância aproximada dos dois textos possíveis (oklch 0.985 e 0.145: Y ≈ L³).
const LIGHT_TEXT_LUMINANCE = 0.955;
const DARK_TEXT_LUMINANCE = 0.003;

function contrastRatio(a: number, b: number): number {
  const [light, dark] = a > b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
}

/** O texto escuro contrasta mais que o claro sobre essa luminância? */
function prefersDarkText(luminance: number): boolean {
  return contrastRatio(luminance, DARK_TEXT_LUMINANCE) > contrastRatio(luminance, LIGHT_TEXT_LUMINANCE);
}

/**
 * Cor de texto (quase-branco ou quase-preto, alinhada aos tokens
 * --primary-foreground) com o MAIOR contraste possível contra o hex. Cores
 * médias (laranja, verde claro) ficam com texto escuro.
 */
export function getAccentForeground(hex: string): string {
  const normalized = normalizeHex(hex) ?? DEFAULT_ACCENT_COLOR;
  return prefersDarkText(relativeLuminance(normalized)) ? "oklch(0.145 0 0)" : "oklch(0.985 0 0)";
}

/** Contraste AA mínimo para texto normal (WCAG 2.x). */
export const AA_CONTRAST = 4.5;

/**
 * Contraste da cor de marca nos dois usos do design system: texto do botão
 * sobre a cor (`onButton`, com o texto claro/escuro que `getAccentForeground`
 * escolheria) e a cor como texto/link sobre o fundo claro (`onLightBackground`).
 */
export function accentContrast(hex: string): { onButton: number; onLightBackground: number } {
  const luminance = relativeLuminance(normalizeHex(hex) ?? DEFAULT_ACCENT_COLOR);
  const text = prefersDarkText(luminance) ? DARK_TEXT_LUMINANCE : LIGHT_TEXT_LUMINANCE;
  return {
    onButton: contrastRatio(luminance, text),
    onLightBackground: contrastRatio(luminance, 1),
  };
}

/**
 * Custom properties CSS que, aplicadas num elemento ancestral, fazem todo o
 * design system (`bg-primary`, `ring-ring`, sidebar ativa, etc.) herdar a
 * cor de destaque do negócio — sem precisar tocar em cada componente.
 */
export function getAccentCssVars(accentColor: string | null | undefined): CSSProperties {
  const color = resolveAccentColor(accentColor);
  const foreground = getAccentForeground(color);

  return {
    "--primary": color,
    "--primary-foreground": foreground,
    "--ring": color,
    "--sidebar-primary": color,
    "--sidebar-primary-foreground": foreground,
    "--sidebar-ring": color,
  } as CSSProperties;
}
