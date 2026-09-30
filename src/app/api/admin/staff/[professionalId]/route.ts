import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { requirePermission } from "@/server/modules/auth/session";
import { getStaffAccess, revokeStaffAccess } from "@/server/modules/staff/staff.service";

type RouteParams = { params: Promise<{ professionalId: string }> };

/** Situação do acesso ao painel deste cadastro: sem acesso, convite enviado, ativo ou revogado. */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission("staff.manage");
    const { professionalId } = await params;
    return NextResponse.json({ access: await getStaffAccess(session.businessId, professionalId) });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Revoga o acesso (e o convite pendente, se houver). */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission("staff.manage");
    const { professionalId } = await params;
    await revokeStaffAccess(session.businessId, professionalId);
    return NextResponse.json({ access: await getStaffAccess(session.businessId, professionalId) });
  } catch (error) {
    return handleApiError(error);
  }
}
