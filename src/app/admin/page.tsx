import { redirect } from "next/navigation";

import { prisma } from "@/server/db/prisma";
import { getAdminSession } from "@/server/modules/auth/session";

import { LogoutButton } from "./logout-button";

export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  if (!session) {
    // O middleware já cobre este caso; isso é apenas uma rede de segurança
    // caso a página seja renderizada por algum outro caminho.
    redirect("/admin/login");
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.userId },
    include: { business: true },
  });

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{user.business.name}</h1>
          <p className="text-muted-foreground">Bem-vindo(a), {user.name}</p>
        </div>
        <LogoutButton />
      </div>
      <p className="text-sm text-muted-foreground">
        Painel do negócio em construção — agenda, profissionais, serviços e relatórios chegam na
        próxima fase.
      </p>
    </main>
  );
}
