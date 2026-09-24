import { addDaysToIsoDate, localDayRangeUtc, todayInTimeZone } from "@/lib/date";
import { prisma } from "@/server/db/prisma";
import { requireAdminSession } from "@/server/modules/auth/session";
import { getReportSummary } from "@/server/modules/report/report.service";

import { ReportsView } from "./reports-view";

export default async function RelatoriosPage() {
  const session = await requireAdminSession();
  const business = await prisma.business.findUniqueOrThrow({ where: { id: session.businessId } });

  const endDate = todayInTimeZone(business.timezone);
  const startDate = addDaysToIsoDate(endDate, -30);

  const { start: startAt } = localDayRangeUtc(startDate, business.timezone);
  const { end: endAt } = localDayRangeUtc(endDate, business.timezone);
  const initialSummary = await getReportSummary(session.businessId, { startAt, endAt });

  return <ReportsView initialSummary={initialSummary} startDate={startDate} endDate={endDate} />;
}
