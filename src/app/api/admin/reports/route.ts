import { NextRequest, NextResponse } from "next/server";

import { localDayRangeUtc } from "@/lib/date";
import { prisma } from "@/server/db/prisma";
import { NotFoundError, ValidationError } from "@/server/errors";
import { handleApiError } from "@/server/http";
import { requireAdminSession } from "@/server/modules/auth/session";
import { getReportSummary } from "@/server/modules/report/report.service";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !DATE_PATTERN.test(startDate) || !endDate || !DATE_PATTERN.test(endDate)) {
      throw new ValidationError("Parâmetros startDate/endDate são obrigatórios (YYYY-MM-DD)");
    }

    const business = await prisma.business.findFirst({
      where: { id: session.businessId, deletedAt: null },
    });
    if (!business) throw new NotFoundError("Negócio não encontrado");

    const { start: startAt } = localDayRangeUtc(startDate, business.timezone);
    const { end: endAt } = localDayRangeUtc(endDate, business.timezone);

    const summary = await getReportSummary(session.businessId, { startAt, endAt });
    return NextResponse.json({ summary });
  } catch (error) {
    return handleApiError(error);
  }
}
