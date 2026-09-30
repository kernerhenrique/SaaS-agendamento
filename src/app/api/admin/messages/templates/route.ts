import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { requirePermission } from "@/server/modules/auth/session";
import {
  getMessageTemplates,
  parseMessageKind,
  resetMessageTemplate,
  saveMessageTemplate,
} from "@/server/modules/notification/whatsapp/message.service";

export async function GET() {
  try {
    const session = await requirePermission("templates.manage");
    return NextResponse.json({ templates: await getMessageTemplates(session.businessId) });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Salva o texto personalizado: `{ kind, body }`. */
export async function PUT(request: NextRequest) {
  try {
    const session = await requirePermission("templates.manage");
    const body = (await request.json().catch(() => null)) as { kind?: unknown; body?: unknown } | null;
    return NextResponse.json({ template: await saveMessageTemplate(session.businessId, parseMessageKind(body?.kind), body?.body) });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Restaura o padrão: `?kind=REMINDER`. */
export async function DELETE(request: NextRequest) {
  try {
    const session = await requirePermission("templates.manage");
    const kind = parseMessageKind(request.nextUrl.searchParams.get("kind"));
    return NextResponse.json({ template: await resetMessageTemplate(session.businessId, kind) });
  } catch (error) {
    return handleApiError(error);
  }
}
