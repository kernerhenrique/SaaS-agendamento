import { redirect } from "next/navigation";

import { can, type Permission } from "./permissions";
import { getAdminSession, type AdminSession } from "./session";

/**
 * Para páginas do painel (Server Components): sem sessão vai ao login; sem a
 * permissão volta ao Início — o profissional que digitar /admin/financeiro
 * não vê a tela nem por um instante. A API continua barrando por conta própria.
 */
export async function requirePagePermission(permission: Permission): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (!can(session.role, permission)) redirect("/admin");
  return session;
}
