import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { requireAdminSession } from "@/server/modules/auth/session";
import { getCommissions } from "@/server/modules/payment/payment.service";

import { parseFinanceRange } from "../../payments/parse";

/** Comissão por profissional no período, pela data de recebimento. */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const commissions = await getCommissions(session.businessId, parseFinanceRange(request.nextUrl.searchParams));
    return NextResponse.json({ commissions });
  } catch (error) {
    return handleApiError(error);
  }
}
