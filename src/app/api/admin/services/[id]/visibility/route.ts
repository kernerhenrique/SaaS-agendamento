import { NextRequest, NextResponse } from "next/server";

import { ValidationError } from "@/server/errors";
import { handleApiError } from "@/server/http";
import { requirePermission } from "@/server/modules/auth/session";
import { setServiceVisibility } from "@/server/modules/service/service.service";
import { assertNotDemo } from "@/server/modules/demo/demo.service";

/** `{ visibleOnline: boolean }` — mostra ou esconde o serviço na página pública. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission("catalog.manage");
    await assertNotDemo(session.businessId);
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (typeof body?.visibleOnline !== "boolean") {
      throw new ValidationError("visibleOnline deve ser verdadeiro ou falso");
    }
    const service = await setServiceVisibility(session.businessId, id, body.visibleOnline);
    return NextResponse.json({ service });
  } catch (error) {
    return handleApiError(error);
  }
}
