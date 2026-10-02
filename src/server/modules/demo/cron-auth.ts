import { timingSafeEqual } from "node:crypto";

/**
 * A Vercel chama as rotas de cron com `Authorization: Bearer <CRON_SECRET>`.
 * Sem o segredo configurado, ninguém passa (nem por engano em produção).
 */
export function isCronAuthorized(authorization: string | null, secret: string | undefined): boolean {
  if (!secret || !authorization) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
