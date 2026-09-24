import Link from "next/link";
import { redirect } from "next/navigation";

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
    <div className="flex flex-1">
      <aside className="flex w-56 flex-col border-r bg-muted/30 p-4">
        <div className="mb-6">
          <p className="text-sm font-semibold">{business.name}</p>
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
