import { NextRequest, NextResponse } from "next/server";

import { ValidationError } from "@/server/errors";
import { handleApiError } from "@/server/http";
import { requirePermission } from "@/server/modules/auth/session";
import { parseClientImport } from "@/server/modules/client/client-import";
import { importClients, type ImportMode } from "@/server/modules/client/client-import.service";
import { assertNotDemo } from "@/server/modules/demo/demo.service";

const MAX_FILE_CHARS = 1_000_000;

/**
 * `{ csv, mode: "skip" | "update", apply }`. Sem `apply`: só a prévia (linhas
 * válidas, erros por linha, novos × já cadastrados). Só o dono importa.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("appointment.manageAny");
    await assertNotDemo(session.businessId);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const csv = typeof body?.csv === "string" ? body.csv : "";
    if (!csv.trim()) throw new ValidationError("Escolha o arquivo da planilha (.csv)");
    if (csv.length > MAX_FILE_CHARS) throw new ValidationError("Arquivo grande demais (máximo 1 MB); divida a planilha");
    const mode: ImportMode = body?.mode === "update" ? "update" : "skip";

    const parsed = parseClientImport(csv);
    const summary = await importClients(session.businessId, parsed.rows, { mode, apply: body?.apply === true && parsed.rows.length > 0 });
    return NextResponse.json({
      validCount: parsed.rows.length,
      preview: parsed.rows.slice(0, 5).map(({ line, name, phone, email, tags }) => ({ line, name, phone, email, tags })),
      errors: parsed.errors,
      duplicatesInFile: parsed.duplicatesInFile,
      ...summary,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
