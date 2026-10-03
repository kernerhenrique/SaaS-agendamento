import { after, NextRequest, NextResponse } from "next/server";

import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { handleApiError, rateLimitedResponse } from "@/server/http";
import { requestPasswordReset } from "@/server/modules/auth/password-reset.service";

const FORGOT_PASSWORD_RATE_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000 };

/**
 * `{ email }` → sempre a mesma resposta, exista ou não a conta. A busca e o
 * envio rodam depois da resposta (`after`): nem o tempo denuncia o e-mail.
 */
export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(`forgot-password:${getClientIp(request.headers)}`, FORGOT_PASSWORD_RATE_LIMIT);
  if (!rateLimit.allowed) return rateLimitedResponse(rateLimit.retryAfterSeconds);
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    if (email) {
      after(async () => {
        try {
          await requestPasswordReset(email);
        } catch (error) {
          console.error("[forgot-password] falha ao enviar o link", error);
        }
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
