import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/server/http";
import { isCronAuthorized } from "@/server/modules/demo/cron-auth";
import { runDemoMaintenance } from "@/server/modules/demo/demo.service";

// Recriar várias demos leva alguns segundos (milhares de registros cada).
export const maxDuration = 60;

/**
 * Rotina da madrugada (Vercel Cron, `vercel.json`): apaga as prévias de
 * demonstração vencidas e recria os dados das demos ativas para o dia.
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  try {
    return NextResponse.json(await runDemoMaintenance());
  } catch (error) {
    return handleApiError(error);
  }
}
