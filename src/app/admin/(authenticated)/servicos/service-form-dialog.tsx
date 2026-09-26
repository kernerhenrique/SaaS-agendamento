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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import type { ProfessionalOption, ServiceCategoryOption, ServiceListItem } from "./types";

const NO_CATEGORY = "none";
const NEW_CATEGORY = "new";

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
  categories,
  onCategoryCreated,
  onSaved,
}: {
  trigger: React.ReactElement;
  service?: ServiceListItem;
  professionals: ProfessionalOption[];
  categories: ServiceCategoryOption[];
  onCategoryCreated: (category: ServiceCategoryOption) => void;
  onSaved: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{service ? "Editar serviço" : "Novo serviço"}</DialogTitle>
          <DialogDescription>Nome, categoria, duração, preço e profissionais que realizam.</DialogDescription>
        </DialogHeader>
        {/* Só monta o formulário enquanto o diálogo está aberto: cada
            abertura começa com estado fresco, sem precisar de um efeito para
            "resetar" campos de uma abertura anterior. */}
        {open ? (
          <ServiceFormFields
            service={service}
            professionals={professionals}
            categories={categories}
            onCategoryCreated={onCategoryCreated}
            onSaved={onSaved}
            onClose={() => setOpen(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ServiceFormFields({
  service,
  professionals,
  categories,
  onCategoryCreated,
  onSaved,
  onClose,
}: {
  service?: ServiceListItem;
  professionals: ProfessionalOption[];
  categories: ServiceCategoryOption[];
  onCategoryCreated: (category: ServiceCategoryOption) => void;
  onSaved: () => void | Promise<void>;
  onClose: () => void;
}) {
  const isEditing = Boolean(service);
  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [durationMin, setDurationMin] = useState(String(service?.durationMin ?? 30));
  const [price, setPrice] = useState(centsToReaisInput(service?.priceCents ?? 0));
  const [priceType, setPriceType] = useState<"FIXED" | "FROM">(service?.priceType ?? "FIXED");
  const [categoryId, setCategoryId] = useState(service?.categoryId ?? NO_CATEGORY);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedProfessionalIds, setSelectedProfessionalIds] = useState<Set<string>>(
    new Set(service?.professionalServices.map((ps) => ps.professional.id) ?? []),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (categoryId === NEW_CATEGORY && !newCategoryName.trim()) {
      setError("Digite o nome da nova categoria");
      return;
    }

    setIsSubmitting(true);
    try {
      let finalCategoryId: string | null = categoryId === NO_CATEGORY ? null : categoryId;

      if (categoryId === NEW_CATEGORY) {
        const categoryResponse = await fetch("/api/admin/service-categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newCategoryName }),
        });
        const categoryData = await categoryResponse.json();
        if (!categoryResponse.ok) {
          setError(categoryData?.error ?? "Não foi possível criar a categoria");
          return;
        }
        onCategoryCreated(categoryData.category);
        finalCategoryId = categoryData.category.id;
      }

      const payload = {
        name,
        description: description || null,
        durationMin: parsedDuration,
        priceCents: parsedCents,
        priceType,
        categoryId: finalCategoryId,
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
      onClose();
      await onSaved();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Dados básicos</h3>
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

        <div className="flex flex-col gap-2">
          <Label htmlFor="category">Categoria (opcional)</Label>
          <Select value={categoryId} onValueChange={(value) => setCategoryId(value ?? NO_CATEGORY)}>
            <SelectTrigger id="category">
              {/* SelectValue não resolve o rótulo do SelectItem sozinho (Base UI
                  só sabe o `value`) — precisa de uma função para mapear o texto. */}
              <SelectValue placeholder="Selecione uma categoria">
                {(value: string) => {
                  if (value === NO_CATEGORY) return "Sem categoria";
                  if (value === NEW_CATEGORY) return "+ Nova categoria";
                  return categories.find((category) => category.id === value)?.name ?? "Selecione uma categoria";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_CATEGORY}>Sem categoria</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
              <SelectItem value={NEW_CATEGORY}>+ Nova categoria</SelectItem>
            </SelectContent>
          </Select>
          {categoryId === NEW_CATEGORY ? (
            <Input
              autoFocus
              placeholder="Nome da categoria"
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
            />
          ) : null}
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
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="priceType">Tipo de preço</Label>
            <Select value={priceType} onValueChange={(value) => setPriceType((value as "FIXED" | "FROM") ?? "FIXED")}>
              <SelectTrigger id="priceType">
                <SelectValue>{(value: "FIXED" | "FROM") => (value === "FROM" ? "A partir de" : "Fixo")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FIXED">Fixo</SelectItem>
                <SelectItem value="FROM">A partir de</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Profissionais que realizam</h3>
        <div className="flex flex-col gap-2">
          {professionals.map((professional) => (
            <Label key={professional.id} className="flex items-center gap-2 text-sm font-normal">
              <Checkbox
                checked={selectedProfessionalIds.has(professional.id)}
                onCheckedChange={() => toggleProfessional(professional.id)}
              />
              {professional.name}
            </Label>
          ))}
        </div>
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
