import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { requireAdminSession } from "@/server/modules/auth/session";
import {
  getAppointmentMessages,
  markMessageSent,
  parseMessageKind,
  unmarkMessageSent,
} from "@/server/modules/notification/whatsapp/message.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Os textos prontos (confirmação, lembrete, pós-atendimento) com o link wa.me de cada um. */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    return NextResponse.json({ messages: await getAppointmentMessages(session.businessId, id) });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Marca como enviada: `{ kind }`. */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as { kind?: unknown } | null;
    return NextResponse.json(await markMessageSent(session.businessId, id, parseMessageKind(body?.kind)));
  } catch (error) {
    return handleApiError(error);
  }
}

/** Desmarca: `?kind=REMINDER`. */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    await unmarkMessageSent(session.businessId, id, parseMessageKind(request.nextUrl.searchParams.get("kind")));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
