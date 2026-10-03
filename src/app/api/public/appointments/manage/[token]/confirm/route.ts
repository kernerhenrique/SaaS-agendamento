import { NextRequest, NextResponse } from "next/server";

import { checkRateLimit, getClientIp, MANAGE_TOKEN_RATE_LIMIT } from "@/lib/rate-limit";
import { handleApiError, rateLimitedResponse } from "@/server/http";
import { confirmPresenceByToken } from "@/server/modules/appointment/manage.service";

interface RouteParams {
  params: Promise<{ token: string }>;
}

/** "Confirmar presença" no link do cliente: agendado → confirmado. */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const ip = getClientIp(request.headers);
  const rateLimit = checkRateLimit(`manage-token:${ip}`, MANAGE_TOKEN_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return rateLimitedResponse(rateLimit.retryAfterSeconds);
  }

  try {
    const { token } = await params;
    const appointment = await confirmPresenceByToken(token);
    return NextResponse.json({ appointment: { status: appointment.status } });
  } catch (error) {
    return handleApiError(error);
  }
}
