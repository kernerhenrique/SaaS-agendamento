import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { requirePermission } from "@/server/modules/auth/session";
import { createStaffInvite } from "@/server/modules/staff/staff.service";
import { assertNotDemo } from "@/server/modules/demo/demo.service";

/** Gera o link de convite (válido por 7 dias; o anterior deixa de valer). */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ professionalId: string }> }) {
  try {
    const session = await requirePermission("staff.manage");
    await assertNotDemo(session.businessId);
    const { professionalId } = await params;
    const invite = await createStaffInvite(session.businessId, professionalId, session.userId);
    return NextResponse.json({ invite }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
