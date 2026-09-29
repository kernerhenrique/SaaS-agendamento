import { prisma } from "@/server/db/prisma";
import { requireAdminSession } from "@/server/modules/auth/session";
import { getBusinessSettings } from "@/server/modules/business/business.service";

import { SettingsView } from "./settings-view";

export const metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const session = await requireAdminSession();
  const [business, user] = await Promise.all([
    getBusinessSettings(session.businessId),
    prisma.user.findUniqueOrThrow({ where: { id: session.userId }, select: { email: true } }),
  ]);

  return <SettingsView business={business} email={user.email} />;
}
