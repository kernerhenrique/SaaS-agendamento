import { redirect } from "next/navigation";

import { AccentColorScope } from "@/components/accent-color-scope";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { getInitials } from "@/lib/text";
import { prisma } from "@/server/db/prisma";
import { getAdminSession } from "@/server/modules/auth/session";

import { LogoutButton } from "./logout-button";
import { NavLinks } from "./nav-links";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: session.businessId },
  });

  return (
    <AccentColorScope accentColor={business.accentColor} className="flex flex-1 flex-col sm:flex-row">
      {/* Navegação mobile: barra superior + links roláveis na horizontal */}
      <div className="flex flex-col border-b border-sidebar-border bg-sidebar sm:hidden">
        <div className="flex items-center justify-between p-3">
          <BusinessBadge name={business.name} logoUrl={business.logoUrl} />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
        <NavLinks className="flex gap-1 overflow-x-auto px-3 pb-3" itemClassName="shrink-0" />
      </div>

      {/* Navegação desktop: sidebar fixa */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground p-4 sm:flex">
        <div className="mb-6">
          <BusinessBadge name={business.name} logoUrl={business.logoUrl} />
        </div>
        <NavLinks className="flex flex-col gap-1" />
        <div className="mt-auto pt-4">
          <LogoutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior desktop: tema no canto direito, como na página pública */}
        <header className="hidden h-14 shrink-0 items-center justify-end border-b bg-card px-6 shadow-sm sm:flex">
          <ThemeToggle />
        </header>
        {children}
      </div>
    </AccentColorScope>
  );
}

function BusinessBadge({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar size="sm">
        <AvatarImage src={logoUrl ?? undefined} alt="" />
        <AvatarFallback>{getInitials(name)}</AvatarFallback>
      </Avatar>
      <p className="truncate text-sm font-semibold">{name}</p>
    </div>
  );
}
