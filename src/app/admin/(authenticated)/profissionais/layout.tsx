import { redirect } from "next/navigation";

import { requirePagePermission } from "@/server/modules/auth/page-access";
import { getSoloProfessional } from "@/server/modules/business/solo.service";

/**
 * Plano Solo: não há equipe para listar nem cadastrar. O horário fica em
 * Configurações e as folgas em "Folgas"; quem abrir um endereço antigo daqui
 * (favorito, link do manual) vai para lá.
 */
export default async function ProfissionaisLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePagePermission("catalog.manage");
  if (await getSoloProfessional(session.businessId)) redirect("/admin/folgas");
  return children;
}
