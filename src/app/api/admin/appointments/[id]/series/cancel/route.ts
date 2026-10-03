import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { requireAppointmentAccess } from "@/server/modules/auth/appointment-access";
import { requireAdminSession } from "@/server/modules/auth/session";
import { cancelSeriesFrom } from "@/server/modules/appointment/series.service";

/** `{ scope: "this" | "following" }`: cancela esta data ou esta e as próximas da série. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    await requireAppointmentAccess(session, id);
    const body = (await request.json().catch(() => null)) as { scope?: unknown } | null;
    const count = await cancelSeriesFrom(session.businessId, id, body?.scope === "following" ? "following" : "this", session.userId);
    return NextResponse.json({ cancelled: count });
  } catch (error) {
    return handleApiError(error);
  }
}
