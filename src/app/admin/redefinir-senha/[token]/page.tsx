import { headers } from "next/headers";
import type { Metadata } from "next";

import { StatusPage } from "@/components/status-page";
import { checkRateLimit, getClientIp, MANAGE_TOKEN_RATE_LIMIT } from "@/lib/rate-limit";
import { NotFoundError } from "@/server/errors";
import { getPasswordResetSummary } from "@/server/modules/auth/password-reset.service";

import { ResetPasswordForm } from "./reset-password-form";

// Link pessoal: não indexar.
export const metadata: Metadata = { title: "Nova senha", robots: { index: false, follow: false } };

/** Link do "Esqueci minha senha": quem abre não está logado (fora do proxy de sessão). */
export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const rateLimit = checkRateLimit(`password-reset:${getClientIp(await headers())}`, MANAGE_TOKEN_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return (
      <StatusPage title="Muitas tentativas">
        <p>Espere alguns minutos e abra o link de novo.</p>
      </StatusPage>
    );
  }

  let summary: Awaited<ReturnType<typeof getPasswordResetSummary>>;
  try {
    summary = await getPasswordResetSummary(token);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return (
        <StatusPage title="Link inválido ou expirado" action={{ href: "/admin/esqueci-senha", label: "Pedir um link novo" }} secondary={{ href: "/admin/login", label: "Voltar para o login" }}>
          <p>O link para criar a senha nova vale 1 hora e só pode ser usado uma vez. Peça outro, que ele chega no seu e-mail.</p>
        </StatusPage>
      );
    }
    throw error;
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <ResetPasswordForm token={token} name={summary.name} />
    </main>
  );
}

