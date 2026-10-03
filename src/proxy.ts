import { NextRequest, NextResponse } from "next/server";

import { refreshTokens } from "@/server/modules/auth/auth.service";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearAuthCookies,
  setAuthCookies,
} from "@/server/modules/auth/cookies";
import { resolveProxySession } from "@/server/modules/auth/proxy-session";
import { verifyAccessToken } from "@/server/modules/auth/tokens";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const session = await resolveProxySession(
    {
      accessToken: request.cookies.get(ACCESS_TOKEN_COOKIE)?.value,
      refreshToken: request.cookies.get(REFRESH_TOKEN_COOKIE)?.value,
    },
    { verifyAccessToken, refreshTokens },
  );

  if (session.status === "valid") {
    return NextResponse.next();
  }

  if (session.status === "refreshed") {
    // Renovação transparente: o access novo vai no cookie da PRÓPRIA
    // requisição (a página/rota já o enxerga via cookies()) e nos cookies da
    // resposta (o navegador guarda para as próximas).
    request.cookies.set(ACCESS_TOKEN_COOKIE, session.tokens.accessToken);
    request.cookies.set(REFRESH_TOKEN_COOKIE, session.tokens.refreshToken);
    const response = NextResponse.next({ request: { headers: request.headers } });
    setAuthCookies(response, session.tokens);
    return response;
  }

  const response = pathname.startsWith("/api/")
    ? NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    : NextResponse.redirect(loginUrl(request, pathname));
  // Refresh inválido ou revogado: limpa para não tentar de novo a cada request.
  if (request.cookies.has(REFRESH_TOKEN_COOKIE)) clearAuthCookies(response);
  return response;
}

function loginUrl(request: NextRequest, pathname: string): URL {
  const url = new URL("/admin/login", request.url);
  url.searchParams.set("redirectTo", pathname);
  return url;
}

// Sessão: access token curto (15 min) verificado só por assinatura/expiração
// (sem banco a cada request); refresh de 7 dias checado no banco
// (tokenVersion) e rotacionado a cada renovação, o que dá a janela deslizante
// de 7 dias sem uso. Logout/troca de senha incrementam tokenVersion: nenhum
// refresh anterior renova mais, e o access vigente vale no máximo 15 min.
// `/admin/convite/*`, `/admin/esqueci-senha` e `/admin/redefinir-senha/*` ficam
// de fora: quem abre ainda não tem conta ou não consegue entrar.
export const config = {
  matcher: ["/admin", "/admin/((?!login|convite|esqueci-senha|redefinir-senha).*)", "/api/admin/((?!auth/).*)"],
};
