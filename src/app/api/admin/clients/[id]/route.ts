import { NextRequest, NextResponse } from "next/server";

import { ValidationError } from "@/server/errors";
import { handleApiError } from "@/server/http";
import { professionalScope } from "@/server/modules/auth/permissions";
import { requireAdminSession, requirePermission } from "@/server/modules/auth/session";
import { deleteClient, getClientDetail, updateClientContact, updateClientNotes } from "@/server/modules/client/client.service";
import { assertNotDemo } from "@/server/modules/demo/demo.service";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    return NextResponse.json(await getClientDetail(session.businessId, id, new Date(), professionalScope(session)));
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Notas internas e tags: `{ internalNotes: string | null, tags: string[] }`
 * (quem atende). Corrigir o contato: `{ contact: { name, phone, email } }` (só o dono).
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

    if (body && typeof body.contact === "object" && body.contact !== null) {
      const session = await requirePermission("appointment.manageAny");
      await assertNotDemo(session.businessId);
      const contact = body.contact as Record<string, unknown>;
      const client = await updateClientContact(session.businessId, id, { name: contact.name, phone: contact.phone, email: contact.email });
      return NextResponse.json({ client });
    }

    const session = await requireAdminSession();
    const internalNotes = body?.internalNotes;
    const tags = body?.tags;
    if (internalNotes !== null && typeof internalNotes !== "string") {
      throw new ValidationError("internalNotes deve ser texto ou null");
    }
    if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === "string")) {
      throw new ValidationError("tags deve ser uma lista de textos");
    }
    const client = await updateClientNotes(session.businessId, id, { internalNotes, tags }, { userId: session.userId, scope: professionalScope(session) });
    return NextResponse.json({ client });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Exclui o cliente a pedido (LGPD): só o dono; os agendamentos futuros são cancelados. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission("appointment.manageAny");
    await assertNotDemo(session.businessId);
    const { id } = await params;
    return NextResponse.json(await deleteClient(session.businessId, id, session.userId));
  } catch (error) {
    return handleApiError(error);
  }
}
