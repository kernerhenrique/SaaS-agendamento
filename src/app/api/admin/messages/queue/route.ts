import { NextRequest, NextResponse } from "next/server";

import { ValidationError } from "@/server/errors";
import { handleApiError } from "@/server/http";
import { professionalScope } from "@/server/modules/auth/permissions";
import { requireAdminSession } from "@/server/modules/auth/session";
import { MESSAGE_QUEUES, getMessageQueue, type MessageQueue } from "@/server/modules/notification/whatsapp/message.service";

/**
 * `?tipo=lembretes` (próximo dia com atendimento, ou `&data=YYYY-MM-DD`) ou
 * `?tipo=pos-atendimento` (concluídos de ontem e hoje).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const tipo = request.nextUrl.searchParams.get("tipo");
    if (!MESSAGE_QUEUES.includes(tipo as MessageQueue)) throw new ValidationError("Tipo de lista inválido");
    const date = request.nextUrl.searchParams.get("data");
    return NextResponse.json(await getMessageQueue(session.businessId, tipo as MessageQueue, professionalScope(session), date));
  } catch (error) {
    return handleApiError(error);
  }
}
