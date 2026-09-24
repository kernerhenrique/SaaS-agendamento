"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { ProfessionalOption, ServiceListItem } from "./types";

function centsToReaisInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

function reaisInputToCents(value: string): number | null {
  const normalized = value.replace(",", ".");
  const parsed = Number(normalized);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

export function ServiceFormDialog({
  trigger,
  service,
  professionals,
  onSaved,
}: {
  trigger: React.ReactElement;
  service?: ServiceListItem;
  professionals: ProfessionalOption[];
  onSaved: () => void | Promise<void>;
}) {
  const isEditing = Boolean(service);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [durationMin, setDurationMin] = useState(String(service?.durationMin ?? 30));
  const [price, setPrice] = useState(centsToReaisInput(service?.priceCents ?? 0));
  const [selectedProfessionalIds, setSelectedProfessionalIds] = useState<Set<string>>(
    new Set(service?.professionalServices.map((ps) => ps.professional.id) ?? []),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(service?.name ?? "");
    setDescription(service?.description ?? "");
    setDurationMin(String(service?.durationMin ?? 30));
    setPrice(centsToReaisInput(service?.priceCents ?? 0));
    setSelectedProfessionalIds(new Set(service?.professionalServices.map((ps) => ps.professional.id) ?? []));
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggleProfessional(id: string) {
    setSelectedProfessionalIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsedDuration = Number(durationMin);
    const parsedCents = reaisInputToCents(price);
    if (!name.trim()) {
      setError("Nome é obrigatório");
      return;
    }
    if (!Number.isInteger(parsedDuration) || parsedDuration <= 0) {
      setError("Duração deve ser um número inteiro de minutos maior que zero");
      return;
    }
    if (parsedCents === null) {
      setError("Preço inválido");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name,
        description: description || null,
        durationMin: parsedDuration,
        priceCents: parsedCents,
        professionalIds: Array.from(selectedProfessionalIds),
      };
      const response = await fetch(
        isEditing ? `/api/admin/services/${service!.id}` : "/api/admin/services",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "Não foi possível salvar");
        return;
      }
      setOpen(false);
      await onSaved();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar serviço" : "Novo serviço"}</DialogTitle>
          <DialogDescription>Nome, duração, preço e profissionais que realizam.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="serviceName">Nome</Label>
            <Input id="serviceName" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="serviceDescription">Descrição (opcional)</Label>
            <Textarea
              id="serviceDescription"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
            />
          </div>

          <div className="flex gap-4">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="duration">Duração (min)</Label>
              <Input
                id="duration"
                type="number"
                min={1}
                value={durationMin}
                onChange={(event) => setDurationMin(event.target.value)}
                required
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="price">Preço (R$)</Label>
              <Input
                id="price"
                inputMode="decimal"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Profissionais que realizam</Label>
            <div className="flex flex-col gap-1">
              {professionals.map((professional) => (
                <label key={professional.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedProfessionalIds.has(professional.id)}
                    onChange={() => toggleProfessional(professional.id)}
                  />
                  {professional.name}
                </label>
              ))}
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
