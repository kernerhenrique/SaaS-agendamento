import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { professionalScope } from "@/server/modules/auth/permissions";
import { requireAdminSession } from "@/server/modules/auth/session";
import { findClientByPhone } from "@/server/modules/client/client.service";

/** `?phone=` → `{ client }` já cadastrado com esse telefone, ou `{ client: null }`. */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const client = await findClientByPhone(
      session.businessId,
      request.nextUrl.searchParams.get("phone") ?? "",
      professionalScope(session),
    );
    return NextResponse.json({ client });
  } catch (error) {
    return handleApiError(error);
  }
}
