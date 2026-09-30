import { prisma } from "@/server/db/prisma";
import { can } from "@/server/modules/auth/permissions";
import { requireAdminSession } from "@/server/modules/auth/session";
import { getBusinessSettings } from "@/server/modules/business/business.service";

import { SettingsView } from "./settings-view";

export const metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const session = await requireAdminSession();
  // Profissional: só a própria conta (trocar senha); os dados do negócio nem são carregados.
  const canManage = can(session.role, "settings.manage");
  const [business, user] = await Promise.all([
    canManage ? getBusinessSettings(session.businessId) : null,
    prisma.user.findUniqueOrThrow({ where: { id: session.userId }, select: { email: true } }),
  ]);

  return <SettingsView business={business} email={user.email} />;
}
