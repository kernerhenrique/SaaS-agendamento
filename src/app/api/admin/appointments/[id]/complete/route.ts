import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { assertPaymentAllowed, requireAppointmentAccess } from "@/server/modules/auth/appointment-access";
import { requireAdminSession } from "@/server/modules/auth/session";
import { completeAppointment } from "@/server/modules/payment/payment.service";

import { parsePaymentInput } from "../../../payments/parse";

/**
 * "Concluir e receber": `{ payment?: {...} }`. Sem `payment` só conclui
 * ("Só concluir"); com ele, conclui e registra na mesma transação.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    const current = await requireAppointmentAccess(session, id);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const payment = body?.payment != null ? parsePaymentInput(body.payment) : undefined;
    if (payment) assertPaymentAllowed(session, payment, current.priceCents);
    const appointment = await completeAppointment(session.businessId, id, payment, session.userId);
    return NextResponse.json({ appointment });
  } catch (error) {
    return handleApiError(error);
  }
}
