import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";
import { ValidationError } from "@/server/errors";
import { handleApiError } from "@/server/http";
import { requirePermission } from "@/server/modules/auth/session";
import { PAYMENT_METHOD_LABELS } from "@/server/modules/payment/payment-rules";
import { getCommissions, listPayments } from "@/server/modules/payment/payment.service";
import { centsToCsv, toCsv } from "@/server/modules/report/report-rules";

import { parseFinanceRange } from "../../payments/parse";

const EXPORTS = ["recebimentos", "comissoes"] as const;
type ExportType = (typeof EXPORTS)[number];

/**
 * Planilha para o contador: `?tipo=recebimentos|comissoes&startDate&endDate`.
 * CSV no formato do Excel pt-BR (BOM, ";" e vírgula decimal), pela data de
 * recebimento — a mesma regra do Financeiro.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requirePermission("reports.view");
    const params = request.nextUrl.searchParams;
    const type = params.get("tipo") as ExportType | null;
    if (!type || !EXPORTS.includes(type)) throw new ValidationError('tipo deve ser "recebimentos" ou "comissoes"');
    const range = parseFinanceRange(params);
    const { timezone } = await prisma.business.findUniqueOrThrow({
      where: { id: session.businessId },
      select: { timezone: true },
    });
    const formatDate = (iso: string) =>
      new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, dateStyle: "short" }).format(new Date(iso));

    let csv: string;
    if (type === "recebimentos") {
      const payments = await listPayments(session.businessId, range);
      csv = toCsv(
        ["Recebido em", "Cliente", "Serviço", "Profissional", "Forma", "Valor (R$)", "Desconto (R$)", "Observação"],
        payments
          .slice()
          .reverse() // mais antigos primeiro, como num extrato
          .map((p) => [
            formatDate(p.receivedAt),
            p.clientName,
            p.serviceName,
            p.professional.name,
            p.amountCents > 0 ? PAYMENT_METHOD_LABELS[p.method] : "Desconto",
            centsToCsv(p.amountCents),
            centsToCsv(p.discountCents),
            p.note,
          ]),
      );
    } else {
      const rows = await getCommissions(session.businessId, range);
      csv = toCsv(
        ["Profissional", "% atual", "Recebido (R$)", "Comissão (R$)", "Recebimentos"],
        [
          ...rows.map((r) => [
            r.professional.name,
            r.professional.commissionPercent ?? "",
            centsToCsv(r.receivedCents),
            centsToCsv(r.commissionCents),
            r.paymentsCount,
          ]),
          [
            "Total",
            "",
            centsToCsv(rows.reduce((s, r) => s + r.receivedCents, 0)),
            centsToCsv(rows.reduce((s, r) => s + r.commissionCents, 0)),
            rows.reduce((s, r) => s + r.paymentsCount, 0),
          ],
        ],
      );
    }

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${type}-${range.startDate}-a-${range.endDate}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
