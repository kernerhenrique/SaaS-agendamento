import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { requirePermission } from "@/server/modules/auth/session";
import { deletePayment } from "@/server/modules/payment/payment.service";

/** Remove um recebimento lançado por engano (fica guardado como removido). Só o dono. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission("payment.delete");
    const { id } = await params;
    await deletePayment(session.businessId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
