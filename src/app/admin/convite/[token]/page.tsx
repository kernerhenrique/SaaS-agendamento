import { headers } from "next/headers";
import type { Metadata } from "next";

import { StatusPage } from "@/components/status-page";
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
  if (!rateLimit.allowed) {
    return (
      <StatusPage title="Muitas tentativas">
        <p>Espere alguns minutos e abra o link de novo.</p>
      </StatusPage>
    );
  }

  let invite: Awaited<ReturnType<typeof getInviteSummary>>;
  try {
    invite = await getInviteSummary(token);
  } catch (error) {
    // Genérico de propósito: não diz se o convite existiu, venceu ou já foi usado.
    if (error instanceof NotFoundError) {
      return (
        <StatusPage title="Convite inválido ou expirado" action={{ href: "/admin/login", label: "Já criei meu acesso: entrar" }}>
          <p>
            O link pode ter vencido (vale 7 dias), já ter sido usado ou ter sido trocado por um novo. Se ainda não criou o seu
            acesso, peça outro link a quem convidou você.
          </p>
        </StatusPage>
      );
    }
    throw error;
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <InviteForm token={token} invite={invite} />
    </main>
  );
}

