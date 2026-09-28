import { NextRequest, NextResponse } from "next/server";

import { refreshTokens } from "@/server/modules/auth/auth.service";
import { clearAuthCookies, REFRESH_TOKEN_COOKIE, setAuthCookies } from "@/server/modules/auth/cookies";
import { ValidationError } from "@/server/errors";

/**
 * Renovação explícita (o proxy já renova sozinho em qualquer rota do painel;
 * esta rota fica para clientes que queiram renovar sem navegar).
 */
export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const tokens = await refreshTokens(refreshToken);
    const response = NextResponse.json({ ok: true });
    setAuthCookies(response, tokens);
    return response;
  } catch (error) {
    if (error instanceof ValidationError) {
      const response = NextResponse.json({ error: error.message }, { status: 401 });
      clearAuthCookies(response);
      return response;
    }
    throw error;
  }
}
