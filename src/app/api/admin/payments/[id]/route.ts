import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { can } from "@/server/modules/auth/permissions";
import { requireAdminSession } from "@/server/modules/auth/session";
import { deletePayment } from "@/server/modules/payment/payment.service";

/**
 * Remove um recebimento lançado por engano (fica guardado como removido).
 * Dono: qualquer um. Quem lançou: o próprio, no mesmo dia.
 */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    await deletePayment(session.businessId, id, {
      isOwner: can(session.role, "payment.delete"),
      userId: session.userId,
      professionalId: session.professionalId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}