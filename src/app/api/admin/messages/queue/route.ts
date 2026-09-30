import { NextRequest, NextResponse } from "next/server";

import { ValidationError } from "@/server/errors";
import { handleApiError } from "@/server/http";
import { professionalScope } from "@/server/modules/auth/permissions";
import { requireAdminSession } from "@/server/modules/auth/session";
import { MESSAGE_QUEUES, getMessageQueue, type MessageQueue } from "@/server/modules/notification/whatsapp/message.service";

/** `?tipo=lembretes` (amanhã) ou `?tipo=pos-atendimento` (concluídos de ontem e hoje). */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const tipo = request.nextUrl.searchParams.get("tipo");
    if (!MESSAGE_QUEUES.includes(tipo as MessageQueue)) throw new ValidationError("Tipo de lista inválido");
    return NextResponse.json(await getMessageQueue(session.businessId, tipo as MessageQueue, professionalScope(session)));
  } catch (error) {
    return handleApiError(error);
  }
}
