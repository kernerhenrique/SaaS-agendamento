import { NextRequest, NextResponse } from "next/server";

import { checkRateLimit } from "@/lib/rate-limit";
import { ValidationError } from "@/server/errors";
import { handleApiError, rateLimitedResponse } from "@/server/http";
import { changeOwnPassword } from "@/server/modules/auth/auth.service";
import { setAuthCookies } from "@/server/modules/auth/cookies";
import { requireAdminSession } from "@/server/modules/auth/session";

// Limita tentativas de adivinhar a senha atual com uma sessão roubada.
const PASSWORD_CHANGE_RATE_LIMIT = { limit: 10, windowMs: 15 * 60 * 1000 };

/**
 * `{ currentPassword, newPassword }`. Fica fora do matcher do proxy
 * (`/api/admin/auth/*`), então confere a sessão aqui. Devolve cookies novos:
 * esta sessão continua, as outras caem pelo `tokenVersion`.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const rateLimit = checkRateLimit(`change-password:${session.userId}`, PASSWORD_CHANGE_RATE_LIMIT);
    if (!rateLimit.allowed) {
      return rateLimitedResponse(rateLimit.retryAfterSeconds);
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const currentPassword = body?.currentPassword;
    const newPassword = body?.newPassword;
    if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
      throw new ValidationError("Informe a senha atual e a nova senha");
    }

    const tokens = await changeOwnPassword(session.userId, currentPassword, newPassword);
    const response = NextResponse.json({ ok: true });
    setAuthCookies(response, tokens);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
