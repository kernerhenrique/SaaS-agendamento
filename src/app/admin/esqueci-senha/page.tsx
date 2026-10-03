import type { Metadata } from "next";

import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Esqueci minha senha", robots: { index: false, follow: false } };

/** Pedido do link para redefinir a senha (fora do proxy de sessão: quem abre não está logado). */
export default function ForgotPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <ForgotPasswordForm />
    </main>
  );
}
