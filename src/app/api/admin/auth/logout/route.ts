import { NextRequest, NextResponse } from "next/server";

import { logout } from "@/server/modules/auth/auth.service";
import { ACCESS_TOKEN_COOKIE, clearAuthCookies, REFRESH_TOKEN_COOKIE } from "@/server/modules/auth/cookies";
import { verifyAccessToken, verifyRefreshToken } from "@/server/modules/auth/tokens";

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  const userId = await resolveUserId(accessToken, refreshToken);
  if (userId) {
    await logout(userId);
  }

  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);
  return response;
}

async function resolveUserId(
  accessToken: string | undefined,
  refreshToken: string | undefined,
): Promise<string | null> {
  if (accessToken) {
    try {
      return (await verifyAccessToken(accessToken)).sub;
    } catch {
      // token de acesso expirado/inválido: cai para tentar o refresh token
    }
  }
  if (refreshToken) {
    try {
      return (await verifyRefreshToken(refreshToken)).sub;
    } catch {
      return null;
    }
  }
  return null;
}
