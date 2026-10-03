"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * "Esqueci minha senha": pede o e-mail e mostra sempre a mesma resposta (a API
 * não revela se a conta existe). O link chega por e-mail e vale por 1 hora.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? "Não foi possível enviar agora. Tente de novo.");
        return;
      }
      setSent(true);
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-sm shadow-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2">
          <BrandLogo />
        </div>
        <CardTitle className="text-lg">Esqueci minha senha</CardTitle>
        <CardDescription>
          {sent ? "Confira a sua caixa de entrada." : "Informe o e-mail que você usa para entrar no painel."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {sent ? (
          <div role="status" className="flex gap-3 rounded-lg border border-success/30 bg-success/10 p-4 text-sm">
            <MailCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
            <p>
              Se <strong className="font-medium">{email}</strong> tiver acesso ao painel, enviamos um link para criar uma
              senha nova. Ele vale por 1 hora. Não chegou? Veja o spam ou fale com o suporte.
            </p>
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="forgot-email">E-mail</Label>
              <Input
                id="forgot-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Enviar link"}
            </Button>
          </form>
        )}
        <Link href="/admin/login" className="text-center text-sm text-primary underline-offset-4 hover:underline">
          Voltar para o login
        </Link>
      </CardContent>
    </Card>
  );
}
