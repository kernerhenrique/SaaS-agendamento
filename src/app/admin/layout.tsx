import Link from "next/link";
import { redirect } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { prisma } from "@/server/db/prisma";
import { getAdminSession } from "@/server/modules/auth/session";

import { LogoutButton } from "./logout-button";

const NAV_ITEMS = [
  { href: "/admin/agenda", label: "Agenda" },
  { href: "/admin/profissionais", label: "Profissionais" },
  { href: "/admin/servicos", label: "Serviços" },
  { href: "/admin/relatorios", label: "Relatórios" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: session.businessId },
  });

  return (
    <div className="flex flex-1 flex-col sm:flex-row">
      {/* Navegação mobile: barra superior + links roláveis na horizontal */}
      <div className="flex flex-col border-b sm:hidden">
        <div className="flex items-center justify-between p-3">
          <p className="text-sm font-semibold">{business.name}</p>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-md px-3 py-2 text-sm text-foreground/80 hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Navegação desktop: sidebar fixa */}
      <aside className="hidden w-56 shrink-0 flex-col border-r bg-muted/30 p-4 sm:flex">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm font-semibold">{business.name}</p>
          <ThemeToggle />
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-foreground/80 hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-4">
          <LogoutButton />
        </div>
      </aside>

      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
