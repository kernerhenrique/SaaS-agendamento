import { NextRequest, NextResponse } from "next/server";

import { ValidationError } from "@/server/errors";
import { handleApiError } from "@/server/http";
import { requireAdminSession } from "@/server/modules/auth/session";
import { createServiceCategory, listServiceCategories } from "@/server/modules/service/service-category.service";

export async function GET() {
  try {
    const session = await requireAdminSession();
    const categories = await listServiceCategories(session.businessId);
    return NextResponse.json({ categories });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const body = await request.json().catch(() => null);
    const name = (body as Record<string, unknown> | null)?.name;
    if (typeof name !== "string") throw new ValidationError("name é obrigatório");

    const category = await createServiceCategory(session.businessId, name);
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
