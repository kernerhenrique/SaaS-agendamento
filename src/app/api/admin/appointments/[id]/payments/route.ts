import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { assertPaymentAllowed, requireAppointmentAccess } from "@/server/modules/auth/appointment-access";
import { requireAdminSession } from "@/server/modules/auth/session";
import { getAppointmentPayments, registerPayment } from "@/server/modules/payment/payment.service";

import { parsePaymentInput } from "../../../payments/parse";

type RouteParams = { params: Promise<{ id: string }> };

/** Recebimentos e situação (pendente/parcial/pago) do atendimento. */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    await requireAppointmentAccess(session, id);
    return NextResponse.json(await getAppointmentPayments(session.businessId, id));
  } catch (error) {
    return handleApiError(error);
  }
}

/** Registra um recebimento (ver parsePaymentInput). Profissional: sem desconto nem troca de valor. */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    const appointment = await requireAppointmentAccess(session, id);
    const input = parsePaymentInput(await request.json().catch(() => null));
    assertPaymentAllowed(session, input, appointment.priceCents);
    const payment = await registerPayment(session.businessId, id, input, session.userId);
    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
