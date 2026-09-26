import { NextRequest, NextResponse } from "next/server";

import { ValidationError } from "@/server/errors";
import { handleApiError } from "@/server/http";
import { requireAdminSession } from "@/server/modules/auth/session";
import { getClientDetail, updateClientNotes } from "@/server/modules/client/client.service";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    return NextResponse.json(await getClientDetail(session.businessId, id));
  } catch (error) {
    return handleApiError(error);
  }
}

/** Notas internas e tags: `{ internalNotes: string | null, tags: string[] }`. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const internalNotes = body?.internalNotes;
    const tags = body?.tags;
    if (internalNotes !== null && typeof internalNotes !== "string") {
      throw new ValidationError("internalNotes deve ser texto ou null");
    }
    if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === "string")) {
      throw new ValidationError("tags deve ser uma lista de textos");
    }
    const client = await updateClientNotes(session.businessId, id, { internalNotes, tags });
    return NextResponse.json({ client });
  } catch (error) {
    return handleApiError(error);
  }
}
