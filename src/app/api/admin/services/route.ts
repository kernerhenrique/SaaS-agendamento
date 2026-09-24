import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { requireAdminSession } from "@/server/modules/auth/session";
import { createService, listServices } from "@/server/modules/service/service.service";
import { parseServiceInput } from "./parse";

export async function GET() {
  try {
    const session = await requireAdminSession();
    const services = await listServices(session.businessId);
    return NextResponse.json({ services });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const body = await request.json().catch(() => null);
    const input = parseServiceInput(body);
    const service = await createService(session.businessId, input);
    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
