import { NextRequest, NextResponse } from "next/server";

import { checkRateLimit, getClientIp, MANAGE_TOKEN_RATE_LIMIT } from "@/lib/rate-limit";
import { handleApiError, rateLimitedResponse } from "@/server/http";
import { setAuthCookies } from "@/server/modules/auth/cookies";
import { getPasswordResetSummary, resetPasswordWithToken } from "@/server/modules/auth/password-reset.service";

type RouteParams = { params: Promise<{ token: string }> };

/** Mesmo limite das outras rotas com token: dificulta tentar tokens no chute. */
function limited(request: NextRequest) {
  const rateLimit = checkRateLimit(`password-reset:${getClientIp(request.headers)}`, MANAGE_TOKEN_RATE_LIMIT);
  return rateLimit.allowed ? null : rateLimitedResponse(rateLimit.retryAfterSeconds);
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const blocked = limited(request);
  if (blocked) return blocked;
  try {
    const { token } = await params;
    return NextResponse.json({ reset: await getPasswordResetSummary(token) });
  } catch (error) {
    return handleApiError(error);
  }
}

/** `{ password }`: grava a senha nova e já entra no painel (cookies de sessão). */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const blocked = limited(request);
  if (blocked) return blocked;
  try {
    const { token } = await params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const password = typeof body?.password === "string" ? body.password : "";
    const response = NextResponse.json({ ok: true });
    setAuthCookies(response, await resetPasswordWithToken(token, password));
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
