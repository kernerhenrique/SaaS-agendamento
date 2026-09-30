import { NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { requirePermission } from "@/server/modules/auth/session";
import { listReceivables } from "@/server/modules/payment/payment.service";

/** Atendimentos concluídos com saldo em aberto. */
export async function GET() {
  try {
    const session = await requirePermission("finance.view");
    return NextResponse.json({ receivables: await listReceivables(session.businessId) });
  } catch (error) {
    return handleApiError(error);
  }
}
