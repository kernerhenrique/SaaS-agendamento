import type { UserRole } from "@/generated/prisma/enums";

/**
 * Quem pode o quê no painel. Módulo puro (sem banco): usado nas rotas, nas
 * páginas e no menu. Regra geral: o dono pode tudo; o profissional trabalha
 * só na própria agenda e com os próprios clientes.
 */

export type Permission =
  /** Financeiro (recebimentos, a receber, comissões de todos). */
  | "finance.view"
  | "reports.view"
  /** Configurações do negócio (a troca da própria senha é liberada para todos). */
  | "settings.manage"
  /** Cadastro de serviços, categorias e profissionais. */
  | "catalog.manage"
  /** Convidar e revogar acesso da equipe. */
  | "staff.manage"
  | "templates.manage"
  | "payment.delete"
  /** Desconto e ajuste do valor do atendimento ao receber. */
  | "payment.discount"
  /** Agenda e clientes de toda a equipe (sem isso, só os próprios). */
  | "appointment.manageAny";

const PROFESSIONAL_PERMISSIONS: ReadonlySet<Permission> = new Set<Permission>([]);

export function can(role: UserRole, permission: Permission): boolean {
  if (role === "OWNER") return true;
  return PROFESSIONAL_PERMISSIONS.has(permission);
}

export interface Access {
  userId: string;
  businessId: string;
  role: UserRole;
  /** Cadastro da agenda do usuário (sempre presente para PROFESSIONAL). */
  professionalId: string | null;
}

/** Pode ver/agir sobre este agendamento? Dono: sempre. Profissional: só os dele. */
export function canActOnAppointment(access: Access, appointment: { professionalId: string }): boolean {
  if (can(access.role, "appointment.manageAny")) return true;
  return access.professionalId != null && appointment.professionalId === access.professionalId;
}

/**
 * Filtro extra de agendamentos para o Prisma: `{}` para o dono,
 * `{ professionalId }` para o profissional. Sempre somado ao `businessId`.
 */
export function professionalScope(access: Access): { professionalId?: string } {
  if (can(access.role, "appointment.manageAny")) return {};
  // Profissional sem cadastro vinculado não enxerga nada (id que nunca existe).
  return { professionalId: access.professionalId ?? "__sem-cadastro__" };
}

export const ROLE_LABELS: Record<UserRole, string> = {
  OWNER: "Dono",
  PROFESSIONAL: "Profissional",
};
