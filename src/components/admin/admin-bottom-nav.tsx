"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ExternalLink, LogOut, Menu, Plus, Smartphone } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { useAdminShell } from "./admin-shell-context";
import { isNavItemActive, useAdminNav, type AdminNavItem } from "./admin-nav";
import { useLogout } from "./use-logout";

/** Itens fixos na barra inferior; o restante fica em "Mais". */
const PRIMARY_HREFS = ["/admin", "/admin/agenda", "/admin/clientes"];

/**
 * Navegação inferior do celular (padrão de app): Início, Agenda, "+" central
 * para novo agendamento, Clientes e "Mais" (gaveta com o resto do menu).
 */
export function AdminBottomNav() {
  const pathname = usePathname();
  const items = useAdminNav();
  const { openNewAppointment, publicPath } = useAdminShell();
  const { logout, isLoggingOut } = useLogout();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const primary = PRIMARY_HREFS.map((href) => items.find((item) => item.href === href)!);
  const more = items.filter((item) => !PRIMARY_HREFS.includes(item.href));
  const isMoreActive = more.some((item) => isNavItemActive(pathname, item.href));

  return (
    <>
      <nav
        aria-label="Menu principal"
        // env(): área segura do iPhone (barra de gesto), não é um valor de design.
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card pb-[env(safe-area-inset-bottom)] shadow-fixed-bar sm:hidden"
      >
        <BottomLink item={primary[0]} active={isNavItemActive(pathname, primary[0].href)} />
        <BottomLink item={primary[1]} active={isNavItemActive(pathname, primary[1].href)} />
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => openNewAppointment()}
            aria-label="Novo agendamento"
            className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Plus className="size-5" />
          </button>
        </div>
        <BottomLink item={primary[2]} active={isNavItemActive(pathname, primary[2].href)} />
        <button
          type="button"
          onClick={() => setIsMoreOpen(true)}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 py-2 text-caption",
            isMoreActive ? "text-primary" : "text-muted-foreground",
          )}
        >
          <Menu className="size-5" />
          Mais
        </button>
      </nav>

      <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-1 px-2 pb-4">
            {more.map((item) => {
              const Icon = item.icon;
              const active = isNavItemActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMoreOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium",
                    active ? "bg-primary/10 text-primary" : "hover:bg-muted",
                  )}
                >
                  <Icon className="size-5" />
                  <span className="flex-1">{item.label}</span>
                  {item.soon ? <span className="text-caption text-muted-foreground">em breve</span> : null}
                </Link>
              );
            })}
            <a
              href={publicPath}
              target="_blank"
              rel="noreferrer"
              onClick={() => setIsMoreOpen(false)}
              className="flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium hover:bg-muted"
            >
              <ExternalLink className="size-5" />
              Ver minha página de reservas
            </a>
            <Link
              href="/admin/instalar"
              onClick={() => setIsMoreOpen(false)}
              className={cn(
                "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium",
                pathname === "/admin/instalar" ? "bg-primary/10 text-primary" : "hover:bg-muted",
              )}
            >
              <Smartphone className="size-5" />
              Instalar no celular
            </Link>
            <button
              type="button"
              onClick={logout}
              disabled={isLoggingOut}
              className="flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              <LogOut className="size-5" />
              {isLoggingOut ? "Saindo..." : "Sair"}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function BottomLink({ item, active }: { item: AdminNavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 py-2 text-caption",
        active ? "font-medium text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="size-5" />
      {item.label}
    </Link>
  );
}
