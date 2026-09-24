"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

import {
  WorkingHoursEditor,
  buildWorkingHoursFormEntries,
  workingHoursFormEntriesToInput,
  type WorkingHoursFormEntry,
} from "./working-hours-editor";
import { TimeBlocksManager } from "./time-blocks-manager";
import type { ProfessionalListItem, ServiceOption } from "./types";

export function ProfessionalFormDialog({
  trigger,
  professional,
  services,
  timezone,
  onSaved,
}: {
  trigger: React.ReactElement;
  professional?: ProfessionalListItem;
  services: ServiceOption[];
  timezone: string;
  onSaved: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{professional ? "Editar profissional" : "Novo profissional"}</DialogTitle>
          <DialogDescription>Nome, serviços realizados e expediente semanal.</DialogDescription>
        </DialogHeader>
        {/* Só monta o formulário enquanto o diálogo está aberto: cada
            abertura começa com estado fresco (derivado de `professional` na
            inicialização dos hooks), sem precisar de um efeito para
            "resetar" campos de uma abertura anterior. */}
        {open ? (
          <ProfessionalFormFields
            professional={professional}
            services={services}
            timezone={timezone}
            onSaved={onSaved}
            onClose={() => setOpen(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ProfessionalFormFields({
  professional,
  services,
  timezone,
  onSaved,
  onClose,
}: {
  professional?: ProfessionalListItem;
  services: ServiceOption[];
  timezone: string;
  onSaved: () => void | Promise<void>;
  onClose: () => void;
}) {
  const isEditing = Boolean(professional);
  const [name, setName] = useState(professional?.name ?? "");
  const [bio, setBio] = useState(professional?.bio ?? "");
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(
    new Set(professional?.professionalServices.map((ps) => ps.service.id) ?? []),
  );
  const [workingHours, setWorkingHours] = useState<WorkingHoursFormEntry[]>(
    buildWorkingHoursFormEntries(professional?.workingHours ?? []),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleService(serviceId: string) {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Nome é obrigatório");
      return;
    }

    let parsedWorkingHours;
    try {
      parsedWorkingHours = workingHoursFormEntriesToInput(workingHours);
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Horário inválido");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name,
        bio: bio || null,
        photoUrl: professional?.photoUrl ?? null,
        serviceIds: Array.from(selectedServiceIds),
        workingHours: parsedWorkingHours,
      };
      const response = await fetch(
        isEditing ? `/api/admin/professionals/${professional!.id}` : "/api/admin/professionals",
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
      onClose();
      await onSaved();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex max-h-[70vh] flex-col gap-6 overflow-y-auto pr-1" onSubmit={handleSubmit}>
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Dados básicos</h3>
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="bio">Bio (opcional)</Label>
          <Textarea id="bio" value={bio} onChange={(event) => setBio(event.target.value)} rows={2} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Serviços realizados</h3>
        <div className="flex flex-col gap-2">
          {services.map((service) => (
            <Label key={service.id} className="flex items-center gap-2 text-sm font-normal">
              <Checkbox
                checked={selectedServiceIds.has(service.id)}
                onCheckedChange={() => toggleService(service.id)}
              />
              {service.name}
            </Label>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Expediente semanal</h3>
        <WorkingHoursEditor value={workingHours} onChange={setWorkingHours} />
      </section>

      {isEditing ? (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">Bloqueios manuais (folga, feriado)</h3>
          <TimeBlocksManager professionalId={professional!.id} timezone={timezone} />
        </section>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
