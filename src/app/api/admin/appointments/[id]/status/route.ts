import { NextRequest, NextResponse } from "next/server";

import { AppointmentStatus } from "@/generated/prisma/enums";
import { ValidationError } from "@/server/errors";
import { handleApiError } from "@/server/http";
import { requireAdminSession } from "@/server/modules/auth/session";
import { updateAppointmentStatus } from "@/server/modules/appointment/appointment.service";

const STATUS_VALUES = new Set<string>(Object.values(AppointmentStatus));

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const status = (body as Record<string, unknown> | null)?.status;

    if (typeof status !== "string" || !STATUS_VALUES.has(status)) {
      throw new ValidationError("status inválido");
    }

    const appointment = await updateAppointmentStatus(
      session.businessId,
      id,
      status as AppointmentStatus,
    );
    return NextResponse.json({ appointment });
  } catch (error) {
    return handleApiError(error);
  }
}
