"use client";

import {
  BarChart3,
  Briefcase,
  CalendarDays,
  Contact,
  House,
  MessageCircle,
  PenTool,
  Scissors,
  Settings,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { ServiceIconKey } from "@/config/vertical";
import { useVertical } from "@/config/vertical-context";
import type { Permission } from "@/server/modules/auth/permissions";

import { useAdminAccess } from "./admin-access-context";

export type AdminNavGroup = "operacao" | "cadastros" | "gestao" | "rodape";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  group: AdminNavGroup;
  /** Tela ainda não construída: aparece no menu com o selo "em breve". */
  soon?: boolean;
}

export const NAV_GROUP_LABELS: Record<Exclude<AdminNavGroup, "rodape">, string> = {
  operacao: "Operação",
  cadastros: "Cadastros",
  gestao: "Gestão",
};

const SERVICE_ICONS: Record<ServiceIconKey, LucideIcon> = {
  scissors: Scissors,
  sparkles: Sparkles,
  "pen-tool": PenTool,
  briefcase: Briefcase,
};

/** Menu do painel, só com o que o papel pode abrir (profissional: sem cadastros, Financeiro e Relatórios). */
export function useAdminNav(): AdminNavItem[] {
  const { terms, serviceIcon } = useVertical();
  const access = useAdminAccess();
  const items: (AdminNavItem & { permission?: Permission })[] = [
    { href: "/admin", label: "Início", icon: House, group: "operacao" },
    { href: "/admin/agenda", label: "Agenda", icon: CalendarDays, group: "operacao" },
    { href: "/admin/clientes", label: terms.client.plural, icon: Contact, group: "operacao" },
    { href: "/admin/profissionais", label: terms.professional.plural, icon: Users, group: "cadastros", permission: "catalog.manage" },
    { href: "/admin/servicos", label: terms.service.plural, icon: SERVICE_ICONS[serviceIcon], group: "cadastros", permission: "catalog.manage" },
    { href: "/admin/financeiro", label: "Financeiro", icon: Wallet, group: "gestao", permission: "finance.view" },
    { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3, group: "gestao", permission: "reports.view" },
    { href: "/admin/mensagens", label: "Mensagens", icon: MessageCircle, group: "gestao" },
    { href: "/admin/configuracoes", label: "Configurações", icon: Settings, group: "rodape" },
  ];
  return items.filter((item) => !item.permission || access.can(item.permission));
}

/** Início só fica ativo na raiz exata; os demais também nas sub-rotas (/admin/profissionais/[id]). */
export function isNavItemActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
