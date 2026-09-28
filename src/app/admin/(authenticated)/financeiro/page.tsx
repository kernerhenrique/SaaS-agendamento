import { prisma } from "@/server/db/prisma";
import { requireAdminSession } from "@/server/modules/auth/session";

import { getProfessionalOptions } from "../agenda/professional-options";
import { FinanceView, type FinanceTab } from "./finance-view";
import { parsePeriodPreset } from "@/lib/period";

export const metadata = { title: "Financeiro" };

const TABS: FinanceTab[] = ["recebimentos", "a-receber", "comissoes"];

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; inicio?: string; fim?: string; aba?: string }>;
}) {
  const session = await requireAdminSession();
  const params = await searchParams;
  const [business, professionals] = await Promise.all([
    prisma.business.findUniqueOrThrow({ where: { id: session.businessId }, select: { timezone: true } }),
    getProfessionalOptions(session.businessId),
  ]);

  return (
    <FinanceView
      timezone={business.timezone}
      professionals={professionals}
      initialPreset={parsePeriodPreset(params.periodo)}
      initialCustom={{ startDate: params.inicio ?? null, endDate: params.fim ?? null }}
      initialTab={TABS.includes(params.aba as FinanceTab) ? (params.aba as FinanceTab) : "recebimentos"}
    />
  );
}
