import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { requireAppointmentAccess } from "@/server/modules/auth/appointment-access";
import { requireAdminSession } from "@/server/modules/auth/session";
import { parseSeriesOptions } from "@/server/modules/appointment/series-rules";
import { createSeries } from "@/server/modules/appointment/series.service";

/** Repetir (ou renovar, a partir da última data): cria só as datas livres. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    await requireAppointmentAccess(session, id);
    const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
    const result = await createSeries(session.businessId, id, parseSeriesOptions(body), session.userId);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
