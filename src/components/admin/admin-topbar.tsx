"use client";

import { LogOut, Plus, Search } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { getInitials } from "@/lib/text";

import { useAdminShell } from "./admin-shell-context";
import { BusinessBadge } from "./business-badge";
import { useLogout } from "./use-logout";

export function AdminTopbar({
  business,
  userName,
}: {
  business: { name: string; logoUrl: string | null };
  userName: string;
}) {
  const { openNewAppointment, openSearch } = useAdminShell();
  const { logout, isLoggingOut } = useLogout();

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-card px-3 shadow-sm sm:px-6">
      {/* Celular: o menu lateral não existe, então o negócio aparece aqui. */}
      <div className="min-w-0 flex-1 sm:hidden">
        <BusinessBadge name={business.name} logoUrl={business.logoUrl} />
      </div>

      <button
        type="button"
        onClick={openSearch}
        className="hidden h-8 w-72 items-center gap-2 rounded-lg border border-input bg-background px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:flex"
      >
        <Search className="size-4" />
        <span className="flex-1 truncate text-left">Buscar cliente, agendamento…</span>
        <kbd className="rounded border bg-muted px-1.5 text-caption">Ctrl K</kbd>
      </button>
      <Button variant="ghost" size="icon" className="sm:hidden" onClick={openSearch} aria-label="Buscar">
        <Search />
      </Button>

      <div className="hidden flex-1 sm:block" />

      <Button className="hidden sm:inline-flex" onClick={() => openNewAppointment()}>
        <Plus />
        Novo agendamento
      </Button>
      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon" className="hidden rounded-full sm:inline-flex" aria-label="Conta" />}
        >
          <Avatar size="sm">
            <AvatarFallback>{getInitials(userName)}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuLabel className="truncate">{userName}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} disabled={isLoggingOut}>
            <LogOut />
            {isLoggingOut ? "Saindo..." : "Sair"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
