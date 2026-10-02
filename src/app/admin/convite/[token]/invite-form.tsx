"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/brand-logo";
import { BRAND } from "@/config/brand";

const MIN_PASSWORD = 8; // mesma regra do servidor (password-rules.ts)

/**
 * Aceite do convite: o profissional escolhe nome, e-mail (login) e senha.
 * Ao criar, já entra no painel (a API devolve os cookies da sessão).
 */
export function InviteForm({
  token,
  invite,
}: {
  token: string;
  invite: { businessName: string; professionalName: string; professionalTerm: string };
}) {
  const router = useRouter();
  const [name, setName] = useState(invite.professionalName);
  const [email, setEmail] = useState("");
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
      const response = await fetch(`/api/public/staff-invite/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Não foi possível criar o acesso");
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
        {BRAND.logoPath ? (
          <div className="mx-auto mb-2">
            <BrandLogo />
          </div>
        ) : (
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserPlus className="size-6" />
          </div>
        )}
        <CardTitle className="text-lg">Criar seu acesso</CardTitle>
        <CardDescription>
          {invite.businessName} convidou você como {invite.professionalTerm.toLowerCase()} ({invite.professionalName}). Você
          vai ver a sua agenda e os seus clientes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-name">Seu nome</Label>
            <Input id="invite-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required maxLength={80} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-email">E-mail (para entrar)</Label>
            <Input
              id="invite-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-password">Senha</Label>
            <Input
              id="invite-password"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-describedby="invite-password-help"
              required
            />
            <p id="invite-password-help" className="text-caption text-muted-foreground">
              Pelo menos {MIN_PASSWORD} caracteres.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-confirm">Confirmar senha</Label>
            <Input
              id="invite-confirm"
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
            {isSubmitting ? "Criando…" : "Criar acesso e entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
