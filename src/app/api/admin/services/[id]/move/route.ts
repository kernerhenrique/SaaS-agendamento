import { NextRequest, NextResponse } from "next/server";

import { ValidationError } from "@/server/errors";
import { handleApiError } from "@/server/http";
import { requireAdminSession } from "@/server/modules/auth/session";
import { moveService } from "@/server/modules/service/service.service";

/** `{ direction: "up" | "down" }` — reordena dentro da mesma categoria. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (body?.direction !== "up" && body?.direction !== "down") {
      throw new ValidationError('direction deve ser "up" ou "down"');
    }
    await moveService(session.businessId, id, body.direction);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
