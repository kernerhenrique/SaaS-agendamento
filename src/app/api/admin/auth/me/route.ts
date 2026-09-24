import { NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";
import { getAdminSession } from "@/server/modules/auth/session";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, businessId: true, email: true, name: true, role: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  return NextResponse.json({ user });
}
