"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarPlus, Contact, RotateCcw, SearchX, Upload } from "lucide-react";

import { useAdminAccess } from "@/components/admin/admin-access-context";
import { useAdminShell } from "@/components/admin/admin-shell-context";
import { EmptyState } from "@/components/empty-state";
import { TableRowsSkeleton } from "@/components/skeletons";
import { TableToolbar } from "@/components/table-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { emptyLabel, lowerTerm } from "@/config/vertical";
import { useVertical } from "@/config/vertical-context";
import { formatPhoneBR } from "@/lib/phone";
import type { ClientFilter } from "@/server/modules/client/client-rules";
import type { ClientListRow } from "@/server/modules/client/client.service";

import { ClientDrawer } from "./client-drawer";

const FILTER_LABELS: Record<ClientFilter, string> = {
  todos: "Todos",
  "sumidos-30": "Sumidos há 30+ dias",
  "sumidos-60": "Sumidos há 60+ dias",
  "sumidos-90": "Sumidos há 90+ dias",
  "mais-faltas": "Mais faltas",
  "mais-atendimentos": "Mais atendimentos",
};

export function ClientsView({
  initialQuery,
  initialFilter,
  initialClientId,
}: {
  initialQuery: string;
  initialFilter: ClientFilter;
  initialClientId?: string;
}) {
  const { terms } = useVertical();
  const canImport = useAdminAccess().can("appointment.manageAny");
  const { timezone, openNewAppointment, appointmentsVersion } = useAdminShell();
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<ClientFilter>(initialFilter);
  const [clients, setClients] = useState<ClientListRow[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(initialClientId ?? null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const params = new URLSearchParams();
      if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
      if (filter !== "todos") params.set("filtro", filter);
      // A URL acompanha busca e filtro (dá para voltar ou compartilhar o link).
      window.history.replaceState(null, "", `/admin/clientes${params.size ? `?${params}` : ""}`);
      const response = await fetch(`/api/admin/clients?${params}`);
      if (!response.ok) throw new Error("load failed");
      setClients((await response.json()).clients);
    } catch {
      setLoadError(true);
    }
    // appointmentsVersion: um agendamento novo muda contagens e "próximo".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, filter, appointmentsVersion]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const formatDate = (iso: string | null) =>
    iso ? new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, dateStyle: "short" }).format(new Date(iso)) : "—";

  const isFiltered = debouncedQuery.trim() !== "" || filter !== "todos";

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-page-title font-bold">{terms.client.plural}</h1>
          {clients ? (
            <p className="text-sm text-muted-foreground">
              {clients.length} {clients.length === 1 ? lowerTerm(terms.client.singular) : lowerTerm(terms.client.plural)}
            </p>
          ) : null}
        </div>
        {canImport ? (
          <Link href="/admin/clientes/importar" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Upload />
            Importar planilha
          </Link>
        ) : null}
      </div>

      <TableToolbar
        searchPlaceholder="Buscar por nome ou telefone"
        searchValue={query}
        onSearchChange={setQuery}
        filters={
          <Select value={filter} onValueChange={(value) => setFilter((value as ClientFilter) ?? "todos")}>
            <SelectTrigger aria-label="Filtrar" className="w-full sm:w-52">
              <SelectValue>{(value: ClientFilter) => FILTER_LABELS[value]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(FILTER_LABELS) as ClientFilter[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {FILTER_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {loadError ? (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
          <span className="flex-1">Não foi possível carregar a lista.</span>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            <RotateCcw />
            Tentar de novo
          </Button>
        </div>
      ) : clients == null ? (
        <div className="rounded-lg border bg-card p-4" aria-busy aria-label="Carregando">
          <TableRowsSkeleton rows={6} columns={5} />
        </div>
      ) : clients.length === 0 ? (
        isFiltered ? (
          <EmptyState
            icon={SearchX}
            title="Ninguém encontrado"
            description="Tente outro nome, telefone ou filtro."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setFilter("todos");
                }}
              >
                Limpar busca e filtro
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Contact}
            title={emptyLabel(terms.client)}
            description="Os cadastros aparecem aqui automaticamente a cada agendamento."
            action={
              <Button size="sm" onClick={() => openNewAppointment()}>
                <CalendarPlus />
                Novo agendamento
              </Button>
            }
          />
        )
      ) : (
        <>
          {/* Desktop: tabela. Celular: lista de cartões (tabela não cabe em 390px). */}
          <div className="hidden rounded-lg border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-right">Atendimentos</TableHead>
                  <TableHead className="text-right">Faltas</TableHead>
                  <TableHead>Última visita</TableHead>
                  <TableHead>Próximo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id} className="cursor-pointer" onClick={() => setSelectedId(client.id)}>
                    <TableCell>
                      <button
                        type="button"
                        className="text-left font-medium hover:underline focus-visible:underline focus-visible:outline-none"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedId(client.id);
                        }}
                      >
                        {client.name}
                      </button>
                      <ClientTags tags={client.tags} />
                    </TableCell>
                    <TableCell className="tabular-nums">{formatPhoneBR(client.phone)}</TableCell>
                    <TableCell className="text-right tabular-nums">{client.completed}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {client.noShows > 0 ? <span className="text-destructive">{client.noShows}</span> : 0}
                    </TableCell>
                    <TableCell className="tabular-nums">{formatDate(client.lastVisitAt)}</TableCell>
                    <TableCell className="tabular-nums">{formatDate(client.nextAppointmentAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="flex flex-col gap-2 md:hidden">
            {clients.map((client) => (
              <li key={client.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(client.id)}
                  className="flex w-full flex-col gap-1 rounded-lg border bg-card p-3 text-left shadow-sm transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{client.name}</span>
                    <span className="shrink-0 text-caption text-muted-foreground tabular-nums">
                      {formatPhoneBR(client.phone)}
                    </span>
                  </span>
                  <span className="text-caption text-muted-foreground">
                    {client.completed} {client.completed === 1 ? "atendimento" : "atendimentos"}
                    {client.noShows > 0 ? ` · ${client.noShows} ${client.noShows === 1 ? "falta" : "faltas"}` : ""}
                    {client.lastVisitAt ? ` · última visita ${formatDate(client.lastVisitAt)}` : ""}
                  </span>
                  <ClientTags tags={client.tags} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <ClientDrawer
        clientId={selectedId}
        timezone={timezone}
        onClose={() => setSelectedId(null)}
        onChanged={() => void load()}
        onNewAppointment={(client) => {
          setSelectedId(null);
          openNewAppointment({ client });
        }}
      />
    </main>
  );
}

function ClientTags({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {tags.map((tag) => (
        <Badge key={tag} variant="secondary">
          {tag}
        </Badge>
      ))}
    </span>
  );
}
