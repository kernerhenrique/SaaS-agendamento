"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MIN_PASSWORD = 8; // mesma regra do servidor (password-rules.ts)

/** Senha nova pelo link do e-mail (ou do suporte). Ao salvar, já entra no painel. */
export function ResetPasswordForm({ token, name }: { token: string; name: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD) {
      setError(`A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres`);
      return;
    }
    if (password !== confirmation) {
      setError("A confirmação não bate com a senha");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/public/password-reset/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Não foi possível salvar a senha");
        return;
      }
      router.push("/admin");
      router.refresh();
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
        <CardTitle className="text-lg">Criar senha nova</CardTitle>
        <CardDescription>Olá, {name}! Escolha a senha nova. As outras sessões abertas vão sair.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reset-password">Senha nova</Label>
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-describedby="reset-password-help"
              required
            />
            <p id="reset-password-help" className="text-caption text-muted-foreground">
              Pelo menos {MIN_PASSWORD} caracteres.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reset-confirm">Confirmar senha nova</Label>
            <Input
              id="reset-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              required
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar e entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
