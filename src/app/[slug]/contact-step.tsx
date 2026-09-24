"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ContactInfo {
  name: string;
  phone: string;
  email: string;
}

export function ContactStep({
  isSubmitting,
  error,
  onSubmit,
}: {
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (contact: ContactInfo) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

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
          <Label htmlFor="clientPhone">Telefone</Label>
          <Input
            id="clientPhone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="clientEmail">E-mail</Label>
          <Input
            id="clientEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Confirmando..." : "Confirmar agendamento"}
        </Button>
      </form>
    </div>
  );
}
