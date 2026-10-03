import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { requirePermission } from "@/server/modules/auth/session";
import { deleteClosure } from "@/server/modules/business/closure.service";
import { assertNotDemo } from "@/server/modules/demo/demo.service";

/** Reabre: remove o dia fechado (os horários voltam a aparecer na página). */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission("settings.manage");
    await assertNotDemo(session.businessId);
    const { id } = await params;
    await deleteClosure(session.businessId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
