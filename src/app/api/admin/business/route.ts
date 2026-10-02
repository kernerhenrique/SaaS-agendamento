import { NextRequest, NextResponse } from "next/server";

import { ValidationError } from "@/server/errors";
import { handleApiError } from "@/server/http";
import { requirePermission } from "@/server/modules/auth/session";
import { parseBookingPolicies, parseBranding, parseBusinessProfile } from "@/server/modules/business/business-rules";
import {
  getBusinessSettings,
  updateBookingPolicies,
  updateBranding,
  updateBusinessProfile,
} from "@/server/modules/business/business.service";
import { assertNotDemo } from "@/server/modules/demo/demo.service";

export async function GET() {
  try {
    const session = await requirePermission("settings.manage");
    return NextResponse.json({ business: await getBusinessSettings(session.businessId) });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Salva uma seção por vez: `{ secao: "negocio" | "identidade" | "reservas", ...campos }`. */
export async function PATCH(request: NextRequest) {
  try {
    const session = await requirePermission("settings.manage");
    await assertNotDemo(session.businessId);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new ValidationError("Corpo da requisição inválido");

    switch (body.secao) {
      case "negocio":
        return NextResponse.json({ business: await updateBusinessProfile(session.businessId, parseBusinessProfile(body)) });
      case "identidade":
        return NextResponse.json({ business: await updateBranding(session.businessId, parseBranding(body)) });
      case "reservas":
        return NextResponse.json({ business: await updateBookingPolicies(session.businessId, parseBookingPolicies(body)) });
      default:
        throw new ValidationError("Seção inválida");
    }
  } catch (error) {
    return handleApiError(error);
  }
}
