import { NextRequest, NextResponse } from "next/server";

import { professionalScope } from "@/server/modules/auth/permissions";
import { requireAdminSession, requirePermission } from "@/server/modules/auth/session";
import { createProfessional, listProfessionals } from "@/server/modules/professional/professional.service";
import { handleApiError } from "@/server/http";
import { parseProfessionalInput } from "./parse";

export async function GET() {
  try {
    const session = await requireAdminSession();
    // Profissional só enxerga o próprio cadastro (sem colegas nem a % deles).
    const scope = professionalScope(session);
    const professionals = (await listProfessionals(session.businessId)).filter(
      (professional) => !scope.professionalId || professional.id === scope.professionalId,
    );
    return NextResponse.json({ professionals });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("catalog.manage");
    const body = await request.json().catch(() => null);
    const input = parseProfessionalInput(body);
    const professional = await createProfessional(session.businessId, input);
    return NextResponse.json({ professional }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
