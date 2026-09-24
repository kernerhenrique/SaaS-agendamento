import { NextRequest, NextResponse } from "next/server";

import { checkRateLimit, getClientIp, MANAGE_TOKEN_RATE_LIMIT } from "@/lib/rate-limit";
import { ValidationError } from "@/server/errors";
import { handleApiError, rateLimitedResponse } from "@/server/http";
import { addReviewByToken } from "@/server/modules/appointment/manage.service";

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
    const record = body as Record<string, unknown> | null;
    const rating = record?.rating;
    const comment = record?.comment;

    if (typeof rating !== "number") {
      throw new ValidationError("rating é obrigatório");
    }

    const review = await addReviewByToken(token, rating, typeof comment === "string" ? comment : undefined);
    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
