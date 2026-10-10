import { prisma } from "@/server/db/prisma";
import { can } from "@/server/modules/auth/permissions";
import { requireAdminSession } from "@/server/modules/auth/session";
import { getBusinessSettings } from "@/server/modules/business/business.service";
import { getSoloProfessional } from "@/server/modules/business/solo.service";

import { SettingsView } from "./settings-view";

export const metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const session = await requireAdminSession();
  // Profissional: só a própria conta (trocar senha); os dados do negócio nem são carregados.
  const canManage = can(session.role, "settings.manage");
  const [business, soloProfessional, user] = await Promise.all([
    canManage ? getBusinessSettings(session.businessId) : null,
    // Plano Solo: o horário e o nome de quem atende ficam aqui (não há cadastro de equipe).
    canManage ? getSoloProfessional(session.businessId) : null,
    prisma.user.findUniqueOrThrow({ where: { id: session.userId }, select: { email: true } }),
  ]);

  return <SettingsView business={business} soloProfessional={soloProfessional} email={user.email} />;
}
