import { NextRequest, NextResponse } from "next/server";

import { ValidationError } from "@/server/errors";
import { handleApiError } from "@/server/http";
import { requireAdminSession } from "@/server/modules/auth/session";
import { createTimeBlock } from "@/server/modules/professional/professional.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    const body = await request.json().catch(() => null);

    const startAtRaw = (body as Record<string, unknown> | null)?.startAt;
    const endAtRaw = (body as Record<string, unknown> | null)?.endAt;
    const reason = (body as Record<string, unknown> | null)?.reason;

    if (typeof startAtRaw !== "string" || typeof endAtRaw !== "string") {
      throw new ValidationError("startAt e endAt são obrigatórios (ISO 8601)");
    }
    const startAt = new Date(startAtRaw);
    const endAt = new Date(endAtRaw);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new ValidationError("startAt/endAt inválidos");
    }

    const timeBlock = await createTimeBlock(session.businessId, id, {
      startAt,
      endAt,
      reason: typeof reason === "string" ? reason : null,
    });
    return NextResponse.json({ timeBlock }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
