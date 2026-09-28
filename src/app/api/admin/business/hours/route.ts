import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { requireAdminSession } from "@/server/modules/auth/session";
import { parseBusinessHours } from "@/server/modules/business/business-rules";
import { replaceBusinessHours } from "@/server/modules/business/business.service";

/** Horário de funcionamento (informativo): `{ hours: [{ weekday, startMinute, endMinute }] }`. */
export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const body = (await request.json().catch(() => null)) as { hours?: unknown } | null;
    const hours = parseBusinessHours(body?.hours);
    return NextResponse.json({ business: await replaceBusinessHours(session.businessId, hours) });
  } catch (error) {
    return handleApiError(error);
  }
}
