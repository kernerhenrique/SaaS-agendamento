"use client";

import { useState, type FormEvent } from "react";
import { Check, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { lowerTerm } from "@/config/vertical";
import { useVertical } from "@/config/vertical-context";
import { PROFESSIONAL_COLORS } from "@/lib/professional-colors";
import { cn } from "cn";

import type { DayHours } from "@/server/modules/business/hours-rules";
import type { ProfessionalListItem, ServiceOption } from "./types";
import {
  WorkingHoursEditor,
  buildWorkingHoursFormEntries,
  workingHoursFormEntriesToInput,
  type WorkingHoursFormEntry,
} from "./working-hours-editor";

/**
 * Cadastro do profissional em página (novo e aba "Dados" do perfil): é um
 * formulário longo — regra do design system, formulário longo vira página.
 */
export function ProfessionalForm({
  professional,
  services,
  businessHours,
  onSaved,
}: {
  professional?: ProfessionalListItem;
  services: ServiceOption[];
  /** Horário de funcionamento: o expediente precisa caber nele (e é o padrão de quem é novo). */
  businessHours: DayHours[];
  onSaved: (saved: { id: string }) => void | Promise<void>;
}) {
  const { terms, features } = useVertical();
  const isEditing = Boolean(professional);
  const [name, setName] = useState(professional?.name ?? "");
  const [specialty, setSpecialty] = useState(professional?.specialty ?? "");
  const [bio, setBio] = useState(professional?.bio ?? "");
  const [color, setColor] = useState<string | null>(professional?.color ?? null);
  const [active, setActive] = useState(professional?.active ?? true);
  const [commission, setCommission] = useState(
    professional?.commissionPercent != null ? String(professional.commissionPercent) : "",
  );
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(
    new Set(professional?.professionalServices.map((ps) => ps.service.id) ?? []),
  );
  const [workingHours, setWorkingHours] = useState<WorkingHoursFormEntry[]>(
    // Cadastro novo já vem com o horário do negócio (o caso mais comum).
    buildWorkingHoursFormEntries(professional?.workingHours ?? businessHours),
  );
  const [photoUrls, setPhotoUrls] = useState<string[]>(professional?.photos.map((photo) => photo.url) ?? []);
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

    const commissionPercent = commission.trim() === "" ? null : Number(commission);
    if (
      features.commissions &&
      commissionPercent != null &&
      (!Number.isInteger(commissionPercent) || commissionPercent < 0 || commissionPercent > 100)
    ) {
      setError("A comissão deve ser um número inteiro de 0 a 100");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        // Preset sem comissões: não manda o campo e o servidor preserva o valor.
        ...(features.commissions ? { commissionPercent } : {}),
        name,
        specialty: specialty.trim() || null,
        bio: bio || null,
        color,
        active,
        photoUrl: professional?.photoUrl ?? null,
        // Preset sem portfólio: mantém as fotos já salvas em vez de apagá-las.
        photoUrls: features.portfolio
          ? photoUrls.map((url) => url.trim()).filter(Boolean)
          : (professional?.photos.map((photo) => photo.url) ?? []),
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
      await onSaved({ id: data.professional.id });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex max-w-2xl flex-col gap-8" onSubmit={handleSubmit}>
      <section className="flex flex-col gap-3">
        <h2 className="text-section-title font-semibold">Dados básicos</h2>
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="specialty">Especialidade (opcional)</Label>
          <Input
            id="specialty"
            placeholder="Ex.: cortes clássicos e degradê"
            value={specialty}
            onChange={(event) => setSpecialty(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="bio">Bio (opcional)</Label>
          <Textarea id="bio" value={bio} onChange={(event) => setBio(event.target.value)} rows={2} />
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Cor na agenda</legend>
          <div className="flex flex-wrap gap-2">
            {PROFESSIONAL_COLORS.map((option) => {
              const selected = color === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  aria-pressed={selected}
                  aria-label={option.label}
                  title={option.label}
                  onClick={() => setColor(selected ? null : option.key)}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-shadow focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none",
                    option.dotClass,
                    selected && "ring-2 ring-foreground",
                  )}
                >
                  {selected ? <Check className="size-4 text-background" /> : null}
                </button>
              );
            })}
          </div>
          <p className="text-caption text-muted-foreground">
            Aparece nas colunas da agenda e no perfil. Clique de novo para tirar.
          </p>
        </fieldset>
        {features.commissions ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="commission">Comissão (opcional)</Label>
            <div className="relative w-32">
              <Input
                id="commission"
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                step={1}
                placeholder="0"
                className="pr-7 text-right tabular-nums"
                value={commission}
                onChange={(event) => setCommission(event.target.value)}
                aria-describedby="commission-help"
              />
              <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm text-muted-foreground">
                %
              </span>
            </div>
            <p id="commission-help" className="text-caption text-muted-foreground">
              Sobre o valor recebido. Mudar vale para os próximos pagamentos; o que já foi recebido mantém a % da época.
            </p>
          </div>
        ) : null}
        <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
          <div className="flex flex-col gap-0.5">
            <Label htmlFor="active">Ativo</Label>
            <p className="text-caption text-muted-foreground">
              Inativo não aparece na agenda, na página pública nem no encaixe. O histórico continua guardado.
            </p>
          </div>
          <Switch id="active" checked={active} onCheckedChange={setActive} />
        </div>
      </section>

      {features.portfolio ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-section-title font-semibold">Portfólio (opcional)</h2>
          <p className="text-caption text-muted-foreground">
            Cole o link de cada foto (hospedada em outro lugar) — sem upload de arquivo por enquanto.
          </p>
          <div className="flex flex-col gap-2">
            {photoUrls.map((url, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  aria-label={`Foto ${index + 1}`}
                  placeholder="https://..."
                  value={url}
                  onChange={(event) =>
                    setPhotoUrls((prev) => prev.map((existing, i) => (i === index ? event.target.value : existing)))
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remover foto ${index + 1}`}
                  onClick={() => setPhotoUrls((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => setPhotoUrls((prev) => [...prev, ""])}
            >
              <Plus />
              Adicionar foto
            </Button>
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-section-title font-semibold">{terms.service.plural} realizados</h2>
        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground">Cadastre {lowerTerm(terms.service.plural)} primeiro.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
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
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-section-title font-semibold">Expediente semanal</h2>
        <p className="text-caption text-muted-foreground">
          Precisa caber no horário de funcionamento do negócio (Configurações › Horário), que aparece ao lado de cada dia.
        </p>
        <WorkingHoursEditor value={workingHours} onChange={setWorkingHours} referenceHours={businessHours} offLabel="Folga" />
      </section>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
