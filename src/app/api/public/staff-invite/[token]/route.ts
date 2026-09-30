import { NextRequest, NextResponse } from "next/server";

import { checkRateLimit, getClientIp, MANAGE_TOKEN_RATE_LIMIT } from "@/lib/rate-limit";
import { handleApiError, rateLimitedResponse } from "@/server/http";
import { issueTokens } from "@/server/modules/auth/auth.service";
import { setAuthCookies } from "@/server/modules/auth/cookies";
import { parseInviteAcceptance } from "@/server/modules/staff/staff-invite-rules";
import { acceptStaffInvite, getInviteSummary } from "@/server/modules/staff/staff.service";

type RouteParams = { params: Promise<{ token: string }> };

/** Mesmo limite das rotas com token do cliente: dificulta tentar tokens no chute. */
function limited(request: NextRequest) {
  const rateLimit = checkRateLimit(`staff-invite:${getClientIp(request.headers)}`, MANAGE_TOKEN_RATE_LIMIT);
  return rateLimit.allowed ? null : rateLimitedResponse(rateLimit.retryAfterSeconds);
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const blocked = limited(request);
  if (blocked) return blocked;
  try {
    const { token } = await params;
    return NextResponse.json({ invite: await getInviteSummary(token) });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Aceita o convite: `{ name, email, password }`. Já entra no painel (cookies de sessão). */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const blocked = limited(request);
  if (blocked) return blocked;
  try {
    const { token } = await params;
    const input = parseInviteAcceptance(await request.json().catch(() => null));
    const user = await acceptStaffInvite(token, input);
    const response = NextResponse.json({ ok: true }, { status: 201 });
    setAuthCookies(response, await issueTokens(user));
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
