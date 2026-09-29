import { addDaysToIsoDate, localMinutesToUtc, todayInTimeZone } from "@/lib/date";
import { buildManageUrl } from "@/server/app-url";
import { prisma } from "@/server/db/prisma";
import { requireAdminSession } from "@/server/modules/auth/session";
import { getMessageTemplates } from "@/server/modules/notification/whatsapp/message.service";
import { buildTemplateValues } from "@/server/modules/notification/whatsapp/templates";

import { MessagesView, type MessagesTab } from "./messages-view";

export const metadata = { title: "Mensagens" };

const TABS: MessagesTab[] = ["lembretes", "pos-atendimento", "modelos"];

export default async function MensagensPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const session = await requireAdminSession();
  const { aba } = await searchParams;
  const [business, templates, service, professional] = await Promise.all([
    prisma.business.findUniqueOrThrow({ where: { id: session.businessId }, select: { name: true, address: true, timezone: true } }),
    getMessageTemplates(session.businessId),
    prisma.service.findFirst({ where: { businessId: session.businessId, active: true, deletedAt: null }, orderBy: { position: "asc" } }),
    prisma.professional.findFirst({ where: { businessId: session.businessId, active: true, deletedAt: null }, orderBy: { name: "asc" } }),
  ]);

  // Prévia dos modelos com os dados do próprio negócio (amanhã às 14:30).
  const sample = buildTemplateValues({
    clientName: "Maria Silva",
    serviceName: service?.name ?? "Atendimento",
    professionalName: professional?.name ?? "Equipe",
    businessName: business.name,
    businessAddress: business.address,
    startAt: localMinutesToUtc(addDaysToIsoDate(todayInTimeZone(business.timezone), 1), 14 * 60 + 30, business.timezone),
    timeZone: business.timezone,
    manageUrl: buildManageUrl("exemplo"),
  });

  return (
    <MessagesView
      timezone={business.timezone}
      templates={templates}
      sample={sample}
      initialTab={TABS.includes(aba as MessagesTab) ? (aba as MessagesTab) : "lembretes"}
    />
  );
}
