import { NextRequest, NextResponse } from "next/server";

import { localDayRangeUtc } from "@/lib/date";
import { prisma } from "@/server/db/prisma";
import { NotFoundError, ValidationError } from "@/server/errors";
import { handleApiError } from "@/server/http";
import { requireAdminSession } from "@/server/modules/auth/session";
import { createManualAppointment, listAppointments } from "@/server/modules/appointment/appointment.service";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate") ?? startDate;
    const professionalId = searchParams.get("professionalId") ?? undefined;

    if (!startDate || !DATE_PATTERN.test(startDate) || !endDate || !DATE_PATTERN.test(endDate)) {
      throw new ValidationError("Parâmetros startDate/endDate são obrigatórios (YYYY-MM-DD)");
    }

    const business = await prisma.business.findFirst({
      where: { id: session.businessId, deletedAt: null },
    });
    if (!business) throw new NotFoundError("Negócio não encontrado");

    const { start: startAt } = localDayRangeUtc(startDate, business.timezone);
    const { end: endAt } = localDayRangeUtc(endDate, business.timezone);

    const appointments = await listAppointments({
      businessId: session.businessId,
      professionalId,
      startAt,
      endAt,
    });

    return NextResponse.json({ appointments });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const body = await request.json().catch(() => null);
    const record = body as Record<string, unknown> | null;

    const professionalId = record?.professionalId;
    const serviceId = record?.serviceId;
    const startAtRaw = record?.startAt;
    const client = record?.client as Record<string, unknown> | undefined;
    const notes = record?.notes;

    if (typeof professionalId !== "string" || typeof serviceId !== "string") {
      throw new ValidationError("professionalId e serviceId são obrigatórios");
    }
    if (typeof startAtRaw !== "string") {
      throw new ValidationError("startAt é obrigatório (ISO 8601)");
    }
    const startAt = new Date(startAtRaw);
    if (Number.isNaN(startAt.getTime())) {
      throw new ValidationError("startAt inválido");
    }
    if (
      typeof client?.name !== "string" ||
      !client.name.trim() ||
      typeof client?.phone !== "string" ||
      !client.phone.trim()
    ) {
      throw new ValidationError("client.name e client.phone são obrigatórios");
    }

    const appointment = await createManualAppointment({
      businessId: session.businessId,
      professionalId,
      serviceId,
      startAt,
      client: {
        name: client.name,
        phone: client.phone,
        email: typeof client.email === "string" ? client.email : undefined,
      },
      notes: typeof notes === "string" ? notes : undefined,
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
