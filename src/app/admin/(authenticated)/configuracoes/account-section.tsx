"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { SettingsCard, useSaveSettings } from "./settings-card";

const MIN_LENGTH = 8; // mesma regra de password-rules.ts (o servidor confere de novo)

export function AccountSection({ email }: { email: string }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const { save, isSaving, error } = useSaveSettings();

  async function handleSubmit() {
    setLocalError(null);
    if (newPassword.length < MIN_LENGTH) {
      setLocalError(`A nova senha precisa ter pelo menos ${MIN_LENGTH} caracteres`);
      return;
    }
    if (newPassword !== confirmation) {
      setLocalError("A confirmação não bate com a nova senha");
      return;
    }
    const ok = await save(
      "/api/admin/auth/password",
      "POST",
      { currentPassword, newPassword },
      "Senha alterada. Outros aparelhos conectados vão precisar entrar de novo.",
    );
    if (ok) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
    }
  }

  return (
    <SettingsCard
      id="conta"
      title="Conta"
      description="Seu acesso ao painel."
      submitLabel="Trocar senha"
      isSaving={isSaving}
      error={localError ?? error}
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="account-email">E-mail de acesso</Label>
        <Input id="account-email" value={email} readOnly autoComplete="username" className="text-muted-foreground sm:w-80" />
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="account-current">Senha atual</Label>
          <Input
            id="account-current"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="account-new">Nova senha</Label>
          <Input
            id="account-new"
            type="password"
            autoComplete="new-password"
            minLength={MIN_LENGTH}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            aria-describedby="account-new-help"
            required
          />
          <p id="account-new-help" className="text-caption text-muted-foreground">
            Pelo menos {MIN_LENGTH} caracteres.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="account-confirm">Confirmar nova senha</Label>
          <Input
            id="account-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            required
          />
        </div>
      </div>
      <p className="text-caption text-muted-foreground">
        Ao trocar, você continua conectado aqui; outros aparelhos vão pedir a nova senha.
      </p>
    </SettingsCard>
  );
}
