import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { requireAdminSession } from "@/server/modules/auth/session";
import { parseClientFilter } from "@/server/modules/client/client-rules";
import { listClients } from "@/server/modules/client/client.service";

/** `?q=` busca por nome/telefone; `?filtro=` um de CLIENT_FILTERS. */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const params = request.nextUrl.searchParams;
    const clients = await listClients(session.businessId, {
      query: params.get("q") ?? "",
      filter: parseClientFilter(params.get("filtro")),
    });
    return NextResponse.json({ clients });
  } catch (error) {
    return handleApiError(error);
  }
}
