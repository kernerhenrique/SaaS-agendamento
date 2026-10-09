"use client";

import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPhoneBR } from "@/lib/phone";

export interface ContactInfo {
  name: string;
  phone: string;
  email: string;
}

export function ContactStep({
  isSubmitting,
  error,
  policyText,
  lockedNotice,
  value,
  onChange,
  onSubmit,
}: {
  isSubmitting: boolean;
  error: string | null;
  policyText?: string | null;
  /** Horário dentro do prazo de cancelamento: avisa antes de confirmar que o link não vai cancelar nem remarcar. */
  lockedNotice?: string | null;
  /** Os dados ficam no fluxo (não aqui): o "Voltar" para trocar o horário não apaga o que foi digitado. */
  value: ContactInfo;
  onChange: (contact: ContactInfo) => void;
  onSubmit: (contact: ContactInfo) => void;
}) {
  const { name, phone, email } = value;
  const setName = (next: string) => onChange({ ...value, name: next });
  const setPhone = (next: string) => onChange({ ...value, phone: next });
  const setEmail = (next: string) => onChange({ ...value, email: next });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ name, phone, email });
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">Seus dados</h2>
      <form className="flex max-w-lg flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="clientName">Nome</Label>
          <Input id="clientName" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="clientPhone">WhatsApp</Label>
          <Input
            id="clientPhone"
            type="tel"
            inputMode="numeric"
            placeholder="(11) 91234-5678"
            value={phone}
            onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="clientEmail">E-mail (opcional)</Label>
          <Input id="clientEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        {lockedNotice ? (
          <p role="note" className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
            {lockedNotice}
          </p>
        ) : null}

        {policyText ? (
          <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">{policyText}</p>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Confirmando..." : "Confirmar agendamento"}
        </Button>
      </form>
    </div>
  );
}
