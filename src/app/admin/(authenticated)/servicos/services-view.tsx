"use client";

import { useCallback, useState } from "react";
import { ArrowDown, ArrowUp, MoreHorizontal, Pencil, Plus, Scissors, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAdminShell } from "@/components/admin/admin-shell-context";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { emptyLabel, newLabel, othersLabel } from "@/config/vertical";
import { useVertical } from "@/config/vertical-context";
import { formatPriceFromCents } from "@/lib/currency";
import type { MoveDirection } from "@/server/modules/service/service-order";

import { ServiceFormDialog } from "./service-form-dialog";
import type { ProfessionalOption, ServiceCategoryOption, ServiceListItem } from "./types";

/** Sem ninguém ativo que faça, o serviço sai da página pública (ver `[slug]/page.tsx`). */
const NOBODY_LABEL = "Ninguém realiza · fora da página até alguém fazer";

function activeProfessionalNames(service: ServiceListItem): string[] {
  return service.professionalServices
    .filter((ps) => ps.professional.active && !ps.professional.deletedAt)
    .map((ps) => ps.professional.name);
}

/**
 * Serviços em tabela agrupada por categoria (a mesma ordem da página
 * pública), com subir/descer e "Visível na página pública". No celular vira
 * lista de cartões com as mesmas ações.
 */
export function ServicesView({
  initialServices,
  professionals,
  initialCategories,
}: {
  initialServices: ServiceListItem[];
  professionals: ProfessionalOption[];
  initialCategories: ServiceCategoryOption[];
}) {
  const { terms, features } = useVertical();
  // Plano Solo: a coluna de quem realiza repetiria o mesmo nome em todas as linhas.
  const { solo } = useAdminShell();
  const [services, setServices] = useState(initialServices);
  const [categories, setCategories] = useState(initialCategories);
  const [editing, setEditing] = useState<ServiceListItem | null>(null);
  const [removing, setRemoving] = useState<ServiceListItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function handleCategoryCreated(category: ServiceCategoryOption) {
    setCategories((prev) => (prev.some((c) => c.id === category.id) ? prev : [...prev, category]));
  }

  const refresh = useCallback(async () => {
    const response = await fetch("/api/admin/services");
    const data = await response.json();
    if (response.ok) setServices(data.services);
  }, []);

  // Sem categorias no preset, tudo num grupo só (sem título).
  const groups: { key: string; title: string | null; items: ServiceListItem[] }[] = [];
  for (const service of services) {
    const key = features.serviceCategories ? (service.category?.id ?? "none") : "all";
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = {
        key,
        title: features.serviceCategories ? (service.category?.name ?? othersLabel(terms.service)) : null,
        items: [],
      };
      groups.push(group);
    }
    group.items.push(service);
  }

  async function move(service: ServiceListItem, direction: MoveDirection) {
    setBusyId(service.id);
    try {
      const response = await fetch(`/api/admin/services/${service.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });
      if (!response.ok) {
        toast.error("Não foi possível mudar a ordem");
        return;
      }
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function toggleVisibility(service: ServiceListItem, visibleOnline: boolean) {
    // Otimista: o switch muda na hora; volta se o servidor recusar.
    setServices((list) => list.map((s) => (s.id === service.id ? { ...s, visibleOnline } : s)));
    const response = await fetch(`/api/admin/services/${service.id}/visibility`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibleOnline }),
    });
    if (!response.ok) {
      setServices((list) => list.map((s) => (s.id === service.id ? { ...s, visibleOnline: !visibleOnline } : s)));
      toast.error("Não foi possível alterar a visibilidade");
      return;
    }
    toast.success(
      visibleOnline
        ? `Agora aparece na página pública: ${service.name}.`
        : `Não aparece mais na página pública: ${service.name}.`,
    );
  }

  async function confirmRemove() {
    if (!removing) return;
    setBusyId(removing.id);
    try {
      const response = await fetch(`/api/admin/services/${removing.id}`, { method: "DELETE" });
      if (!response.ok) {
        toast.error("Não foi possível remover");
        return;
      }
      toast.success("Removido.");
      setRemoving(null);
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  const priceLabel = (service: ServiceListItem) =>
    `${features.priceFrom && service.priceType === "FROM" ? "a partir de " : ""}${formatPriceFromCents(service.priceCents)}`;

  const actionsMenu = (service: ServiceListItem) => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Ações de ${service.name}`} />}>
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setEditing(service)}>
          <Pencil /> Editar
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => setRemoving(service)}>
          <Trash2 /> Remover
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const orderButtons = (service: ServiceListItem, index: number, count: number) => (
    <div className="flex gap-0.5">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Subir ${service.name}`}
        disabled={index === 0 || busyId != null}
        onClick={() => void move(service, "up")}
      >
        <ArrowUp />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Descer ${service.name}`}
        disabled={index === count - 1 || busyId != null}
        onClick={() => void move(service, "down")}
      >
        <ArrowDown />
      </Button>
    </div>
  );

  const visibilitySwitch = (service: ServiceListItem) => (
    <Switch
      checked={service.visibleOnline}
      onCheckedChange={(checked) => void toggleVisibility(service, checked)}
      aria-label={`${service.name} visível na página pública`}
    />
  );

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-page-title font-bold">{terms.service.plural}</h1>
        <ServiceFormDialog
          trigger={
            <Button>
              <Plus />
              {newLabel(terms.service)}
            </Button>
          }
          professionals={professionals}
          categories={categories}
          onCategoryCreated={handleCategoryCreated}
          onSaved={refresh}
        />
      </div>

      {services.length === 0 ? (
        <EmptyState icon={Scissors} title={emptyLabel(terms.service)} />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <section key={group.key} className="flex flex-col gap-2" aria-label={group.title ?? terms.service.plural}>
              {group.title ? <h2 className="text-section-title font-semibold">{group.title}</h2> : null}

              <div className="hidden rounded-lg border bg-card md:block">
                {/* table-fixed: colunas alinhadas entre os grupos (uma tabela por categoria). */}
                <Table className="table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Ordem</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="w-24">Duração</TableHead>
                      <TableHead className="w-36">Preço</TableHead>
                      {solo ? null : <TableHead className="w-1/4">{terms.professional.plural}</TableHead>}
                      <TableHead className="w-28">Na página</TableHead>
                      <TableHead className="w-12">
                        <span className="sr-only">Ações</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map((service, index) => (
                      <TableRow key={service.id}>
                        <TableCell>{orderButtons(service, index, group.items.length)}</TableCell>
                        <TableCell className="max-w-72">
                          <span className="block font-medium">{service.name}</span>
                          {service.description ? (
                            <span className="block truncate text-caption text-muted-foreground">{service.description}</span>
                          ) : null}
                          {solo && activeProfessionalNames(service).length === 0 ? (
                            <span className="block text-caption whitespace-normal text-warning">{NOBODY_LABEL}</span>
                          ) : null}
                        </TableCell>
                        <TableCell className="tabular-nums">{service.durationMin} min</TableCell>
                        <TableCell className="tabular-nums">{priceLabel(service)}</TableCell>
                        {solo ? null : (
                          <TableCell className={activeProfessionalNames(service).length ? "max-w-56 truncate" : "whitespace-normal"}>
                            {activeProfessionalNames(service).join(", ") || <span className="text-warning">{NOBODY_LABEL}</span>}
                          </TableCell>
                        )}
                        <TableCell>{visibilitySwitch(service)}</TableCell>
                        <TableCell>{actionsMenu(service)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <ul className="flex flex-col gap-2 md:hidden">
                {group.items.map((service, index) => (
                  <li key={service.id} className="flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">{service.name}</p>
                        <p className="text-caption text-muted-foreground">
                          {service.durationMin} min · {priceLabel(service)}
                        </p>
                      </div>
                      {actionsMenu(service)}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      {orderButtons(service, index, group.items.length)}
                      <label className="flex items-center gap-2 text-caption text-muted-foreground">
                        Na página pública
                        {visibilitySwitch(service)}
                      </label>
                    </div>
                    {activeProfessionalNames(service).length === 0 ? (
                      <p className="text-caption text-warning">{NOBODY_LABEL}</p>
                    ) : null}
                    {!service.visibleOnline ? (
                      <Badge variant="outline" className="w-fit">
                        Só encaixe no painel
                      </Badge>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <p className="text-caption text-muted-foreground">
            A ordem e a visibilidade valem para a página pública. O que estiver oculto continua disponível para encaixe
            no painel.
          </p>
        </div>
      )}

      <ServiceFormDialog
        key={editing?.id ?? "none"}
        service={editing ?? undefined}
        open={editing != null}
        onOpenChange={(open) => !open && setEditing(null)}
        professionals={professionals}
        categories={categories}
        onCategoryCreated={handleCategoryCreated}
        onSaved={refresh}
      />

      <Dialog open={removing != null} onOpenChange={(open) => !open && setRemoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover {removing?.name}?</DialogTitle>
            <DialogDescription>
              Sai da página pública e do encaixe. Agendamentos já feitos continuam no histórico.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoving(null)}>
              Voltar
            </Button>
            <Button variant="destructive" disabled={busyId != null} onClick={() => void confirmRemove()}>
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
