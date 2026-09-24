import { NextResponse } from "next/server";

import { NotFoundError, UnauthorizedError, ValidationError } from "@/server/errors";

export function rateLimitedResponse(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { error: "Muitas tentativas. Tente novamente em instantes." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  throw error;
}
