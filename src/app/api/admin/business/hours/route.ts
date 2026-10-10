import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { requirePermission } from "@/server/modules/auth/session";
import { parseBusinessHours, parseSoloHours } from "@/server/modules/business/business-rules";
import { getBusinessSettings, replaceBusinessHours } from "@/server/modules/business/business.service";
import { getSoloProfessional, replaceSoloHours } from "@/server/modules/business/solo.service";
import { assertNotDemo } from "@/server/modules/demo/demo.service";

/**
 * Horário de funcionamento (página pública; o expediente da equipe precisa caber nele): `{ hours: [{ weekday, startMinute, endMinute }] }`.
 * Plano Solo: cada dia aceita também `breakStartMinute`/`breakEndMinute`, e a mesma semana vira o expediente da pessoa.
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await requirePermission("settings.manage");
    await assertNotDemo(session.businessId);
    const body = (await request.json().catch(() => null)) as { hours?: unknown } | null;
    const soloProfessional = await getSoloProfessional(session.businessId);
    if (soloProfessional) {
      await replaceSoloHours(session.businessId, soloProfessional.id, parseSoloHours(body?.hours));
      return NextResponse.json({ business: await getBusinessSettings(session.businessId) });
    }
    const hours = parseBusinessHours(body?.hours);
    return NextResponse.json({ business: await replaceBusinessHours(session.businessId, hours) });
  } catch (error) {
    return handleApiError(error);
  }
}
