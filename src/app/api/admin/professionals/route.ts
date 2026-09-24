import { NextRequest, NextResponse } from "next/server";

import { requireAdminSession } from "@/server/modules/auth/session";
import { createProfessional, listProfessionals } from "@/server/modules/professional/professional.service";
import { handleApiError } from "@/server/http";
import { parseProfessionalInput } from "./parse";

export async function GET() {
  try {
    const session = await requireAdminSession();
    const professionals = await listProfessionals(session.businessId);
    return NextResponse.json({ professionals });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const body = await request.json().catch(() => null);
    const input = parseProfessionalInput(body);
    const professional = await createProfessional(session.businessId, input);
    return NextResponse.json({ professional }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
