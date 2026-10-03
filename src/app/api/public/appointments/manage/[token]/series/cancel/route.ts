import { after, NextRequest, NextResponse } from "next/server";

import { checkRateLimit, getClientIp, MANAGE_TOKEN_RATE_LIMIT } from "@/lib/rate-limit";
import { ValidationError } from "@/server/errors";
import { handleApiError, rateLimitedResponse } from "@/server/http";
import { cancelSeriesOccurrencesByToken } from "@/server/modules/appointment/manage.service";
import { notifyBusinessOfClientAction } from "@/server/modules/notification/business-alerts";

/** Link do cliente: `{ appointmentId, scope: "one" | "following" }` — "Não vou neste dia" ou "Cancelar todas as próximas". */
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const rateLimit = checkRateLimit(`manage-token:${getClientIp(request.headers)}`, MANAGE_TOKEN_RATE_LIMIT);
  if (!rateLimit.allowed) return rateLimitedResponse(rateLimit.retryAfterSeconds);
  try {
    const { token } = await params;
    const body = (await request.json().catch(() => null)) as { appointmentId?: unknown; scope?: unknown } | null;
    if (typeof body?.appointmentId !== "string") throw new ValidationError("Informe a data");
    const scope = body.scope === "following" ? "following" : "one";
    const cancelled = await cancelSeriesOccurrencesByToken(token, body.appointmentId, scope);
    if (cancelled.length > 0) {
      after(async () => {
        try {
          const others = cancelled.length - 1;
          await notifyBusinessOfClientAction(cancelled[0], "CANCELLED", undefined, others > 0 ? `e as próximas ${others} datas também` : undefined);
        } catch (alertError) {
          console.error("[series-cancel] falha ao avisar o negócio", alertError);
        }
      });
    }
    return NextResponse.json({ cancelled });
  } catch (error) {
    return handleApiError(error);
  }
}
