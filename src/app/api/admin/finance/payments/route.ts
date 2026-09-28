import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { requireAdminSession } from "@/server/modules/auth/session";
import { listPayments } from "@/server/modules/payment/payment.service";

import { parseFinanceRange, parsePaymentMethod } from "../../payments/parse";

/** Recebimentos do período (`?startDate&endDate[&method][&professionalId]`). */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const params = request.nextUrl.searchParams;
    const payments = await listPayments(session.businessId, parseFinanceRange(params), {
      method: parsePaymentMethod(params.get("method")),
      professionalId: params.get("professionalId") || undefined,
    });
    return NextResponse.json({ payments });
  } catch (error) {
    return handleApiError(error);
  }
}
