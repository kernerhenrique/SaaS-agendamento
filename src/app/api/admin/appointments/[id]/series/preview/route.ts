import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { requireAppointmentAccess } from "@/server/modules/auth/appointment-access";
import { requireAdminSession } from "@/server/modules/auth/session";
import { parseSeriesOptions } from "@/server/modules/appointment/series-rules";
import { previewSeries } from "@/server/modules/appointment/series.service";

/** `{ frequencyWeeks, count }` → as próximas datas e o que impede cada uma (nada é gravado). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    await requireAppointmentAccess(session, id);
    const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
    const preview = await previewSeries(session.businessId, id, parseSeriesOptions(body));
    return NextResponse.json({
      frequencyWeeks: preview.frequencyWeeks,
      occurrences: preview.occurrences.map((o) => ({ date: o.date, startAt: o.startAt.toISOString(), problem: o.problem })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
