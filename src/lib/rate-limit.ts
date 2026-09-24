interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Next.js/Turbopack pode compilar Route Handlers e Server Components de
// página em módulos separados — um `const buckets = new Map()` no topo do
// módulo não é necessariamente a MESMA instância entre eles, mesmo dentro do
// mesmo processo (confirmado: um limite ficava "furado" entre a página de
// gerenciamento e as rotas de API que deveriam compartilhar o mesmo balde).
// Guardar em `globalThis` garante uma única instância por processo,
// independente de qual módulo/chunk a importa (mesmo padrão do singleton do
// PrismaClient em src/server/db/prisma.ts).
const globalForRateLimit = globalThis as unknown as {
  __rateLimitBuckets: Map<string, RateLimitEntry> | undefined;
};
const buckets = globalForRateLimit.__rateLimitBuckets ?? new Map<string, RateLimitEntry>();
globalForRateLimit.__rateLimitBuckets = buckets;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Limitador de taxa simples, em memória, por processo — suficiente para
 * demonstrar a mitigação (e funciona em dev/demo de instância única). Em
 * produção com múltiplas instâncias seria necessário um armazenamento
 * compartilhado (ex. Redis/Upstash) para o limite valer entre instâncias;
 * documentado aqui como limitação conhecida do MVP.
 */
export function checkRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Limite compartilhado por todas as rotas que recebem o manage_token. */
export const MANAGE_TOKEN_RATE_LIMIT = { limit: 20, windowMs: 5 * 60 * 1000 };

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
