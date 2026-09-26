"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  PenTool,
  Scissors,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { ServiceIconKey } from "@/config/vertical";
import { useVertical } from "@/config/vertical-context";
import { cn } from "cn";

const SERVICE_ICONS: Record<ServiceIconKey, LucideIcon> = {
  scissors: Scissors,
  sparkles: Sparkles,
  "pen-tool": PenTool,
  briefcase: Briefcase,
};

export function NavLinks({ className, itemClassName }: { className?: string; itemClassName?: string }) {
  const pathname = usePathname();
  const { terms, serviceIcon } = useVertical();

  const navItems: { href: string; label: string; icon: LucideIcon }[] = [
    { href: "/admin/agenda", label: "Agenda", icon: CalendarDays },
    { href: "/admin/profissionais", label: terms.professional.plural, icon: Users },
    { href: "/admin/servicos", label: terms.service.plural, icon: SERVICE_ICONS[serviceIcon] },
    { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
  ];

  return (
    <nav className={className}>
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              itemClassName,
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
