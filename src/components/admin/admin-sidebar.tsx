"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { BusinessBadge } from "./business-badge";
import { NAV_GROUP_LABELS, isNavItemActive, useAdminNav, type AdminNavItem } from "./admin-nav";
import { SIDEBAR_COOKIE } from "./sidebar-cookie";

/**
 * Menu lateral do desktop. O estado recolhido fica num cookie lido pelo
 * layout no servidor — assim a página já nasce com a largura certa, sem piscar.
 */
export function AdminSidebar({
  business,
  defaultCollapsed,
}: {
  business: { name: string; logoUrl: string | null };
  defaultCollapsed: boolean;
}) {
  const pathname = usePathname();
  const items = useAdminNav();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; path=/admin; max-age=31536000; samesite=lax`;
  }

  const groups = (Object.keys(NAV_GROUP_LABELS) as (keyof typeof NAV_GROUP_LABELS)[])
    .map((group) => ({ group, items: items.filter((item) => item.group === group) }))
    // Profissional não tem "Cadastros": o grupo vazio some com o título.
    .filter(({ items: groupItems }) => groupItems.length > 0);
  const footerItems = items.filter((item) => item.group === "rodape");

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-svh shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 sm:flex",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className={cn("flex h-14 items-center border-b border-sidebar-border", collapsed ? "justify-center" : "px-4")}>
        <BusinessBadge name={business.name} logoUrl={business.logoUrl} compact={collapsed} />
      </div>

      <nav aria-label="Menu principal" className="flex flex-1 flex-col gap-4 overflow-y-auto p-2">
        {groups.map(({ group, items: groupItems }) => (
          <div key={group} className="flex flex-col gap-0.5">
            {collapsed ? null : (
              <p className="px-3 pb-1 text-caption font-medium text-sidebar-foreground/50 uppercase">
                {NAV_GROUP_LABELS[group]}
              </p>
            )}
            {groupItems.map((item) => (
              <SidebarLink key={item.href} item={item} active={isNavItemActive(pathname, item.href)} collapsed={collapsed} />
            ))}
          </div>
        ))}
      </nav>

      <div className="flex flex-col gap-0.5 border-t border-sidebar-border p-2">
        {footerItems.map((item) => (
          <SidebarLink key={item.href} item={item} active={isNavItemActive(pathname, item.href)} collapsed={collapsed} />
        ))}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          className={cn("text-sidebar-foreground/70", collapsed ? "self-center" : "justify-start")}
          onClick={toggle}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          {collapsed ? null : "Recolher"}
        </Button>
      </div>
    </aside>
  );
}

function SidebarLink({ item, active, collapsed }: { item: AdminNavItem; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        "flex h-9 items-center gap-3 rounded-md text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        collapsed ? "justify-center" : "px-3",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {collapsed ? null : (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.soon ? <span className="text-caption font-normal opacity-60">em breve</span> : null}
        </>
      )}
    </Link>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right">
        {item.label}
        {item.soon ? " (em breve)" : ""}
      </TooltipContent>
    </Tooltip>
  );
}
