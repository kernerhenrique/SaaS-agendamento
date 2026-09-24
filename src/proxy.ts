import { NextRequest, NextResponse } from "next/server";

import { ACCESS_TOKEN_COOKIE } from "@/server/modules/auth/cookies";
import { verifyAccessToken } from "@/server/modules/auth/tokens";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const isAuthenticated = token ? await isValidAccessToken(token) : false;

  if (isAuthenticated) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("redirectTo", pathname);
  return NextResponse.redirect(loginUrl);
}

async function isValidAccessToken(token: string): Promise<boolean> {
  try {
    await verifyAccessToken(token);
    return true;
  } catch {
    return false;
  }
}

// O access token só é verificado (assinatura + expiração), sem checar o
// banco a cada request. A revogação (logout, troca de senha) invalida o
// refresh token imediatamente; o access token em si permanece válido até
// expirar naturalmente (TTL curto, 15min) — janela de exposição limitada e
// intencional, documentada como trade-off do MVP.
export const config = {
  matcher: ["/admin", "/admin/((?!login).*)", "/api/admin/((?!auth/).*)"],
};
