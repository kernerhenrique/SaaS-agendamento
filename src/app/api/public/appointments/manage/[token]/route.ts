import { NextRequest, NextResponse } from "next/server";

import { checkRateLimit, getClientIp, MANAGE_TOKEN_RATE_LIMIT } from "@/lib/rate-limit";
import { handleApiError, rateLimitedResponse } from "@/server/http";
import { getAppointmentForManagement } from "@/server/modules/appointment/manage.service";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const ip = getClientIp(request.headers);
  const rateLimit = checkRateLimit(`manage-token:${ip}`, MANAGE_TOKEN_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return rateLimitedResponse(rateLimit.retryAfterSeconds);
  }

  try {
    const { token } = await params;
    const appointment = await getAppointmentForManagement(token);
    return NextResponse.json({ appointment });
  } catch (error) {
    return handleApiError(error);
  }
}
