import { headers } from "next/headers";
import type { Metadata } from "next";

import { checkRateLimit, getClientIp, MANAGE_TOKEN_RATE_LIMIT } from "@/lib/rate-limit";
import { NotFoundError } from "@/server/errors";
import { getInviteSummary } from "@/server/modules/staff/staff.service";

import { InviteForm } from "./invite-form";

// Link pessoal: não indexar.
export const metadata: Metadata = { title: "Convite", robots: { index: false, follow: false } };

/** Convite de acesso ao painel: quem abre ainda não tem conta (fora do proxy de sessão). */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const rateLimit = checkRateLimit(`staff-invite:${getClientIp(await headers())}`, MANAGE_TOKEN_RATE_LIMIT);
  if (!rateLimit.allowed) return <Message text="Muitas tentativas. Tente novamente em instantes." />;

  let invite: Awaited<ReturnType<typeof getInviteSummary>>;
  try {
    invite = await getInviteSummary(token);
  } catch (error) {
    if (error instanceof NotFoundError) return <Message text={error.message} />;
    throw error;
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <InviteForm token={token} invite={invite} />
    </main>
  );
}

function Message({ text }: { text: string }) {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <p className="max-w-sm text-center text-sm text-muted-foreground">{text}</p>
    </main>
  );
}
