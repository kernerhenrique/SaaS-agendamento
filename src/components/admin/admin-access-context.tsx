"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { UserRole } from "@/generated/prisma/enums";
import { can, type Permission } from "@/server/modules/auth/permissions";

/**
 * Quem está logado no painel, para as telas esconderem o que o papel não
 * pode (a mesma matriz do servidor, `permissions.ts`). É só conforto visual:
 * quem garante é a API, que responde 403/404.
 */
interface AdminAccess {
  role: UserRole;
  /** Cadastro da agenda do profissional logado (null para o dono). */
  professionalId: string | null;
  can: (permission: Permission) => boolean;
  /** Atalho: dono (vê e mexe em tudo). */
  isOwner: boolean;
}

const AdminAccessContext = createContext<AdminAccess | null>(null);

export function AdminAccessProvider({
  role,
  professionalId,
  children,
}: {
  role: UserRole;
  professionalId: string | null;
  children: ReactNode;
}) {
  const value = useMemo<AdminAccess>(
    () => ({
      role,
      professionalId,
      can: (permission) => can(role, permission),
      isOwner: can(role, "appointment.manageAny"),
    }),
    [role, professionalId],
  );
  return <AdminAccessContext.Provider value={value}>{children}</AdminAccessContext.Provider>;
}

/** Fora do painel (style guide isolado, testes), vale como dono. */
export function useAdminAccess(): AdminAccess {
  return (
    useContext(AdminAccessContext) ?? {
      role: "OWNER",
      professionalId: null,
      can: () => true,
      isOwner: true,
    }
  );
}
