import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";
import { handleApiError } from "@/server/http";
import { professionalScope } from "@/server/modules/auth/permissions";
import { requireAdminSession } from "@/server/modules/auth/session";
import { searchAdmin } from "@/server/modules/search/search.service";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const query = request.nextUrl.searchParams.get("q") ?? "";
    const business = await prisma.business.findUniqueOrThrow({
      where: { id: session.businessId },
      select: { timezone: true },
    });
    const results = await searchAdmin(session.businessId, query.slice(0, 100), business.timezone, professionalScope(session));
    return NextResponse.json(results);
  } catch (error) {
    return handleApiError(error);
  }
}
