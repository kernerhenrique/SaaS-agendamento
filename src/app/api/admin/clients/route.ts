import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { professionalScope } from "@/server/modules/auth/permissions";
import { requireAdminSession } from "@/server/modules/auth/session";
import { parseClientFilter } from "@/server/modules/client/client-rules";
import { listClients, listClientTags } from "@/server/modules/client/client.service";

/** `?q=` busca por nome, tag ou telefone; `?filtro=` um de CLIENT_FILTERS; `?tag=` uma tag. Devolve também as tags em uso. */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const params = request.nextUrl.searchParams;
    const scope = professionalScope(session);
    const [clients, tags] = await Promise.all([
      listClients(
        session.businessId,
        { query: params.get("q") ?? "", filter: parseClientFilter(params.get("filtro")), tag: params.get("tag") },
        new Date(),
        scope,
      ),
      listClientTags(session.businessId, scope),
    ]);
    return NextResponse.json({ clients, tags });
  } catch (error) {
    return handleApiError(error);
  }
}
