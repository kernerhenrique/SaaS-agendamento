/**
 * Tokens de movimento para micro-interações com a lib `motion`. Duração em
 * segundos (formato esperado pela lib). Manter discreto — nada acima de
 * ~350ms — e sempre checar `useReducedMotion` antes de animar algo que não
 * seja puramente decorativo.
 */
export const MOTION_DURATION = {
  fast: 0.15,
  base: 0.2,
  slow: 0.35,
} as const;

export const MOTION_EASE = {
  standard: [0.4, 0, 0.2, 1],
  decelerate: [0, 0, 0.2, 1],
  accelerate: [0.4, 0, 1, 1],
} as const;
