import { NextRequest, NextResponse } from "next/server";

import { requireProfessionalAccess } from "@/server/modules/auth/appointment-access";
import { requireAdminSession, requirePermission } from "@/server/modules/auth/session";
import {
  deleteProfessional,
  getProfessional,
  updateProfessional,
} from "@/server/modules/professional/professional.service";
import { handleApiError } from "@/server/http";
import { parseProfessionalInput } from "../parse";
import { assertNotDemo } from "@/server/modules/demo/demo.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    requireProfessionalAccess(session, id);
    const professional = await getProfessional(session.businessId, id);
    return NextResponse.json({ professional });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission("catalog.manage");
    await assertNotDemo(session.businessId);
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const input = parseProfessionalInput(body);
    const professional = await updateProfessional(session.businessId, id, input);
    return NextResponse.json({ professional });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission("catalog.manage");
    await assertNotDemo(session.businessId);
    const { id } = await params;
    await deleteProfessional(session.businessId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
