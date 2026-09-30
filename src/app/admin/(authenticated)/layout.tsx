import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AccentColorScope } from "@/components/accent-color-scope";
import { AdminBottomNav } from "@/components/admin/admin-bottom-nav";
import { AdminShellProvider } from "@/components/admin/admin-shell-context";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SIDEBAR_COOKIE } from "@/components/admin/sidebar-cookie";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { AdminAccessProvider } from "@/components/admin/admin-access-context";
import { getVertical } from "@/config/vertical";
import { VerticalProvider } from "@/config/vertical-context";
import { prisma } from "@/server/db/prisma";
import { getAdminSession } from "@/server/modules/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const [business, user, cookieStore] = await Promise.all([
    prisma.business.findUniqueOrThrow({ where: { id: session.businessId } }),
    prisma.user.findUniqueOrThrow({ where: { id: session.userId }, select: { name: true } }),
    cookies(),
  ]);
  const sidebarCollapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === "collapsed";
  const businessBadge = { name: business.name, logoUrl: business.logoUrl };
  // "Dono" ou o termo do nicho ("Barbeiro") ao lado do nome, na barra superior.
  const roleLabel = session.role === "OWNER" ? "Dono" : getVertical(business.businessType).terms.professional.singular;

  return (
    <VerticalProvider verticalKey={business.businessType}>
      <AdminAccessProvider role={session.role} professionalId={session.professionalId}>
        <AccentColorScope accentColor={business.accentColor} className="flex flex-1">
          <AdminShellProvider timezone={business.timezone}>
            <AdminSidebar business={businessBadge} defaultCollapsed={sidebarCollapsed} />
            {/* pb-20 no celular: espaço para a navegação inferior fixa. */}
            <div className="flex min-w-0 flex-1 flex-col pb-20 sm:pb-0">
              <AdminTopbar business={businessBadge} userName={user.name} roleLabel={roleLabel} />
              {children}
            </div>
            <AdminBottomNav />
          </AdminShellProvider>
        </AccentColorScope>
      </AdminAccessProvider>
    </VerticalProvider>
  );
}
