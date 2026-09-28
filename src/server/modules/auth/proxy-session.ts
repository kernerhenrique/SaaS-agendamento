import type { AuthTokens } from "./auth.service";

export type ProxySession =
  | { status: "valid" }
  | { status: "refreshed"; tokens: AuthTokens }
  | { status: "anonymous" };

export interface ProxySessionDeps {
  /** Lança se o access token for inválido ou expirado. */
  verifyAccessToken: (token: string) => Promise<unknown>;
  /** Lança se o refresh token for inválido, expirado ou revogado (tokenVersion). */
  refreshTokens: (refreshToken: string) => Promise<AuthTokens>;
}

/**
 * Decide o que o proxy faz com os cookies de sessão de uma requisição:
 * access válido segue; access ausente/expirado com refresh válido renova em
 * silêncio (o dono não cai no login no meio do uso); senão, anônimo.
 * Dependências injetadas para testar sem banco (tests/unit/proxy-session.spec.ts).
 */
export async function resolveProxySession(
  cookies: { accessToken?: string; refreshToken?: string },
  deps: ProxySessionDeps,
): Promise<ProxySession> {
  if (cookies.accessToken) {
    try {
      await deps.verifyAccessToken(cookies.accessToken);
      return { status: "valid" };
    } catch {
      // Expirado ou inválido: tenta o refresh abaixo.
    }
  }
  if (!cookies.refreshToken) return { status: "anonymous" };
  try {
    return { status: "refreshed", tokens: await deps.refreshTokens(cookies.refreshToken) };
  } catch {
    return { status: "anonymous" };
  }
}
