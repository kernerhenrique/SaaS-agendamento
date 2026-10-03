import { headers } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";

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
  if (!rateLimit.allowed) return <Message text="Muitas tentativas. Tente novamente em instantes." />;

  let summary: Awaited<ReturnType<typeof getPasswordResetSummary>>;
  try {
    summary = await getPasswordResetSummary(token);
  } catch (error) {
    if (error instanceof NotFoundError) return <Message text={error.message} />;
    throw error;
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <ResetPasswordForm token={token} name={summary.name} />
    </main>
  );
}

function Message({ text }: { text: string }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
      <p className="max-w-sm text-center text-sm text-muted-foreground">{text}</p>
      <Link href="/admin/esqueci-senha" className="text-sm text-primary underline-offset-4 hover:underline">
        Pedir um link novo
      </Link>
    </main>
  );
}
