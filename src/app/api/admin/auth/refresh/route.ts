import { NextRequest, NextResponse } from "next/server";

import { refreshAccessToken } from "@/server/modules/auth/auth.service";
import { clearAuthCookies, REFRESH_TOKEN_COOKIE, setAccessTokenCookie } from "@/server/modules/auth/cookies";
import { ValidationError } from "@/server/errors";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const accessToken = await refreshAccessToken(refreshToken);
    const response = NextResponse.json({ ok: true });
    setAccessTokenCookie(response, accessToken);
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
