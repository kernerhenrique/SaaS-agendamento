import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { requirePermission } from "@/server/modules/auth/session";
import { parseBusinessHours } from "@/server/modules/business/business-rules";
import { replaceBusinessHours } from "@/server/modules/business/business.service";
import { assertNotDemo } from "@/server/modules/demo/demo.service";

/** Horário de funcionamento (informativo): `{ hours: [{ weekday, startMinute, endMinute }] }`. */
export async function PUT(request: NextRequest) {
  try {
    const session = await requirePermission("settings.manage");
    await assertNotDemo(session.businessId);
    const body = (await request.json().catch(() => null)) as { hours?: unknown } | null;
    const hours = parseBusinessHours(body?.hours);
    return NextResponse.json({ business: await replaceBusinessHours(session.businessId, hours) });
  } catch (error) {
    return handleApiError(error);
  }
}
