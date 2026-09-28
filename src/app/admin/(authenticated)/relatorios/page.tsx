import { parsePeriodPreset } from "@/lib/period";
import { prisma } from "@/server/db/prisma";
import { requireAdminSession } from "@/server/modules/auth/session";
import { REPORT_SECTIONS, type ReportSection } from "@/server/modules/report/report.service";

import { ReportsView } from "./reports-view";

export const metadata = { title: "Relatórios" };

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; inicio?: string; fim?: string; aba?: string }>;
}) {
  const session = await requireAdminSession();
  const params = await searchParams;
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: session.businessId },
    select: { timezone: true },
  });

  return (
    <ReportsView
      timezone={business.timezone}
      initialPreset={parsePeriodPreset(params.periodo)}
      initialCustom={{ startDate: params.inicio ?? null, endDate: params.fim ?? null }}
      initialSection={REPORT_SECTIONS.includes(params.aba as ReportSection) ? (params.aba as ReportSection) : "atendimentos"}
    />
  );
}
