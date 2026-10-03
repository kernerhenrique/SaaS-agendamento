import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";
import { ValidationError } from "@/server/errors";
import { handleApiError } from "@/server/http";
import { requireAdminSession, requirePermission } from "@/server/modules/auth/session";
import { parseClosureInput } from "@/server/modules/business/closure-rules";
import { createClosures, listUpcomingClosures } from "@/server/modules/business/closure.service";
import { assertNotDemo } from "@/server/modules/demo/demo.service";

async function businessTimeZone(businessId: string): Promise<string> {
  const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId }, select: { timezone: true } });
  return business.timezone;
}

/** Dias fechados de hoje em diante. Qualquer pessoa do painel (agenda e encaixe avisam). */
export async function GET() {
  try {
    const session = await requireAdminSession();
    return NextResponse.json({ closures: await listUpcomingClosures(session.businessId, await businessTimeZone(session.businessId)) });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * `{ closures: [{ startDate, endDate?, reason }] }` (o botão de feriados manda
 * vários). Devolve os criados e os agendamentos que já existem nesses dias.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("settings.manage");
    await assertNotDemo(session.businessId);
    const body = (await request.json().catch(() => null)) as { closures?: unknown } | null;
    if (!Array.isArray(body?.closures) || body.closures.length === 0 || body.closures.length > 40) {
      throw new ValidationError("Informe de 1 a 40 dias fechados");
    }
    const ranges = body.closures.map(parseClosureInput);
    const result = await createClosures(session.businessId, await businessTimeZone(session.businessId), ranges);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
