"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import type { BusinessSettings } from "@/server/modules/business/business.service";

/**
 * Salva uma seção das Configurações. Em sucesso: toast e `router.refresh()`,
 * para o shell (nome, logo, cor de marca, termos do nicho) refletir na hora.
 * Erro de validação volta como texto para mostrar junto do botão.
 */
export function useSaveSettings(onSaved?: (business: BusinessSettings) => void) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(url: string, method: "PATCH" | "PUT" | "POST", body: unknown, successMessage = "Alterações salvas") {
    setError(null);
    setIsSaving(true);
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Não foi possível salvar");
        return false;
      }
      toast.success(successMessage);
      if (data?.business) onSaved?.(data.business as BusinessSettings);
      router.refresh();
      return true;
    } catch {
      toast.error("Sem conexão. Tente de novo.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  return { save, isSaving, error };
}

export function SettingsCard({
  id,
  title,
  description,
  onSubmit,
  isSaving,
  error,
  submitLabel = "Salvar",
  children,
}: {
  id: string;
  title: string;
  description: string;
  onSubmit: () => void;
  isSaving: boolean;
  error: string | null;
  submitLabel?: string;
  children: ReactNode;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="scroll-mt-20">
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle id={`${id}-titulo`} className="text-section-title">
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">{children}</CardContent>
          <CardFooter className="flex flex-wrap items-center justify-end gap-3 border-t">
            {error ? (
              <p role="alert" className="mr-auto text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Salvando..." : submitLabel}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </section>
  );
}
