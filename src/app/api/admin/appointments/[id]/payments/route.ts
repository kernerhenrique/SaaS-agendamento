import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { requireAdminSession } from "@/server/modules/auth/session";
import { getAppointmentPayments, registerPayment } from "@/server/modules/payment/payment.service";

import { parsePaymentInput } from "../../../payments/parse";

type RouteParams = { params: Promise<{ id: string }> };

/** Recebimentos e situação (pendente/parcial/pago) do atendimento. */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    return NextResponse.json(await getAppointmentPayments(session.businessId, id));
  } catch (error) {
    return handleApiError(error);
  }
}

/** Registra um recebimento (ver parsePaymentInput). */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    const input = parsePaymentInput(await request.json().catch(() => null));
    const payment = await registerPayment(session.businessId, id, input);
    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
