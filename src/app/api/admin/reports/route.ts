import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";
import { NotFoundError, ValidationError } from "@/server/errors";
import { handleApiError } from "@/server/http";
import { requireAdminSession } from "@/server/modules/auth/session";
import {
  REPORT_SECTIONS,
  getReport,
  getReportSummary,
  type ReportSection,
} from "@/server/modules/report/report.service";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `?startDate&endDate[&secao=atendimentos|faturamento|profissionais|servicos|clientes]`.
 * Sem `secao`, devolve o resumo no formato antigo (`{ summary }`).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const section = searchParams.get("secao");

    if (!startDate || !DATE_PATTERN.test(startDate) || !endDate || !DATE_PATTERN.test(endDate)) {
      throw new ValidationError("Parâmetros startDate/endDate são obrigatórios (YYYY-MM-DD)");
    }
    if (section && !REPORT_SECTIONS.includes(section as ReportSection)) {
      throw new ValidationError("Seção de relatório inválida");
    }

    const business = await prisma.business.findFirst({
      where: { id: session.businessId, deletedAt: null },
    });
    if (!business) throw new NotFoundError("Negócio não encontrado");
    const range = { startDate, endDate, timeZone: business.timezone };

    if (!section) {
      return NextResponse.json({ summary: await getReportSummary(session.businessId, range) });
    }
    return NextResponse.json({ report: await getReport(session.businessId, range, section as ReportSection) });
  } catch (error) {
    return handleApiError(error);
  }
}
