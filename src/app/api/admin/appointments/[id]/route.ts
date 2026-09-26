import { NextRequest, NextResponse } from "next/server";

import { ValidationError } from "@/server/errors";
import { handleApiError } from "@/server/http";
import {
  getAppointmentDetail,
  rescheduleAppointmentAsAdmin,
} from "@/server/modules/appointment/appointment.service";
import { requireAdminSession } from "@/server/modules/auth/session";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    const detail = await getAppointmentDetail(session.businessId, id);
    return NextResponse.json(detail);
  } catch (error) {
    return handleApiError(error);
  }
}

/** Remarcar: `{ startAt: ISO, professionalId, allowOutsideHours? }`. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

    const startAtRaw = body?.startAt;
    const professionalId = body?.professionalId;
    if (typeof startAtRaw !== "string" || typeof professionalId !== "string") {
      throw new ValidationError("startAt (ISO) e professionalId são obrigatórios");
    }
    const startAt = new Date(startAtRaw);
    if (Number.isNaN(startAt.getTime())) throw new ValidationError("startAt inválido");

    const appointment = await rescheduleAppointmentAsAdmin(session.businessId, id, {
      startAt,
      professionalId,
      allowOutsideHours: body?.allowOutsideHours === true,
    });
    return NextResponse.json({ appointment });
  } catch (error) {
    return handleApiError(error);
  }
}
