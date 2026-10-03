import { after, NextRequest, NextResponse } from "next/server";

import { checkRateLimit, getClientIp, MANAGE_TOKEN_RATE_LIMIT } from "@/lib/rate-limit";
import { ValidationError } from "@/server/errors";
import { handleApiError, rateLimitedResponse } from "@/server/http";
import { rescheduleAppointmentByToken } from "@/server/modules/appointment/manage.service";
import { notifyBusinessOfClientAction } from "@/server/modules/notification/business-alerts";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const ip = getClientIp(request.headers);
  const rateLimit = checkRateLimit(`manage-token:${ip}`, MANAGE_TOKEN_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return rateLimitedResponse(rateLimit.retryAfterSeconds);
  }

  try {
    const { token } = await params;
    const body = await request.json().catch(() => null);
    const startAtRaw = (body as Record<string, unknown> | null)?.startAt;
    if (typeof startAtRaw !== "string") {
      throw new ValidationError("startAt é obrigatório (ISO 8601)");
    }
    const startAt = new Date(startAtRaw);
    if (Number.isNaN(startAt.getTime())) {
      throw new ValidationError("startAt inválido");
    }

    const { appointment, previousStartAt } = await rescheduleAppointmentByToken(token, startAt);
    after(async () => {
      try {
        await notifyBusinessOfClientAction(appointment.id, "RESCHEDULED", previousStartAt);
      } catch (alertError) {
        console.error("[reschedule] falha ao avisar o negócio", alertError);
      }
    });
    return NextResponse.json({ appointment });
  } catch (error) {
    return handleApiError(error);
  }
}
