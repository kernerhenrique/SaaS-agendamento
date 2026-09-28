import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { requireAdminSession } from "@/server/modules/auth/session";
import { getFinanceSummary } from "@/server/modules/payment/payment.service";

import { parseFinanceRange } from "../../payments/parse";

/** KPIs do Financeiro no período (`?startDate&endDate`). */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const summary = await getFinanceSummary(session.businessId, parseFinanceRange(request.nextUrl.searchParams));
    return NextResponse.json({ summary });
  } catch (error) {
    return handleApiError(error);
  }
}
