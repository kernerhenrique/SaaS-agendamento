import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { requireProfessionalAccess } from "@/server/modules/auth/appointment-access";
import { requireAdminSession } from "@/server/modules/auth/session";
import { deleteTimeBlock } from "@/server/modules/professional/professional.service";

interface RouteParams {
  params: Promise<{ id: string; blockId: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdminSession();
    const { id, blockId } = await params;
    // Bloqueios (folga, almoço): o profissional gerencia os da própria agenda.
    requireProfessionalAccess(session, id);
    await deleteTimeBlock(session.businessId, id, blockId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
