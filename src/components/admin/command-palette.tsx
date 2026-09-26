"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarClock, Plus, User } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useVertical } from "@/config/vertical-context";
import { formatPhoneBR } from "@/lib/phone";

import { useAdminNav } from "./admin-nav";
import { useAdminShell } from "./admin-shell-context";

interface SearchResults {
  clients: { id: string; name: string; phone: string }[];
  appointments: { id: string; date: string; startAt: string; clientName: string; serviceName: string }[];
}

const EMPTY: SearchResults = { clients: [], appointments: [] };

/** Busca sem acento e sem diferenciar maiúsculas ("configuracoes" acha "Configurações"). */
function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const { terms } = useVertical();
  const { openNewAppointment, timezone } = useAdminShell();
  const navItems = useAdminNav();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!open) return;
    const term = query.trim();
    if (term.length < 2) {
      // Limpa resultados de uma busca anterior ao apagar o texto.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults(EMPTY);
      return;
    }
    let cancelled = false;
    setIsSearching(true);
    // Espera o usuário parar de digitar antes de ir ao servidor.
    const timer = setTimeout(() => {
      fetch(`/api/admin/search?q=${encodeURIComponent(term)}`)
        .then((response) => (response.ok ? response.json() : EMPTY))
        .then((data: SearchResults) => {
          if (!cancelled) setResults(data);
        })
        .catch(() => {
          if (!cancelled) setResults(EMPTY);
        })
        .finally(() => {
          if (!cancelled) setIsSearching(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open]);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setQuery("");
      setResults(EMPTY);
    }
  }

  function go(href: string) {
    handleOpenChange(false);
    router.push(href);
  }

  const normalizedQuery = normalize(query.trim());
  const screens = navItems.filter((item) => !normalizedQuery || normalize(item.label).includes(normalizedQuery));
  const formatTime = (iso: string) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(
      new Date(iso),
    );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="top-1/4 translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg" showCloseButton={false}>
        <DialogTitle className="sr-only">Buscar</DialogTitle>
        <DialogDescription className="sr-only">
          Busque {terms.client.plural.toLowerCase()}, agendamentos e telas do painel.
        </DialogDescription>
        {/* Filtro próprio (shouldFilter=false): resultados vêm do servidor já filtrados. */}
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Buscar ${terms.client.singular.toLowerCase()}, agendamento ou tela…`}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-96">
            <CommandEmpty>{isSearching ? "Buscando…" : "Nada encontrado."}</CommandEmpty>

            {!normalizedQuery ? (
              <CommandGroup heading="Ações">
                <CommandItem
                  value="novo-agendamento"
                  onSelect={() => {
                    handleOpenChange(false);
                    openNewAppointment();
                  }}
                >
                  <Plus />
                  Novo agendamento
                </CommandItem>
              </CommandGroup>
            ) : null}

            {results.clients.length > 0 ? (
              <CommandGroup heading={terms.client.plural}>
                {results.clients.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={`client-${client.id}`}
                    onSelect={() => go(`/admin/clientes?q=${encodeURIComponent(client.name)}`)}
                  >
                    <User />
                    <span className="flex-1 truncate">{client.name}</span>
                    <span className="text-caption text-muted-foreground">{formatPhoneBR(client.phone)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {results.appointments.length > 0 ? (
              <CommandGroup heading="Próximos agendamentos">
                {results.appointments.map((appointment) => (
                  <CommandItem
                    key={appointment.id}
                    value={`appointment-${appointment.id}`}
                    onSelect={() => go(`/admin/agenda?date=${appointment.date}`)}
                  >
                    <CalendarClock />
                    <span className="flex-1 truncate">
                      {appointment.clientName} · {appointment.serviceName}
                    </span>
                    <span className="text-caption text-muted-foreground">{formatTime(appointment.startAt)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {screens.length > 0 ? (
              <CommandGroup heading="Ir para">
                {screens.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem key={item.href} value={`screen-${item.href}`} onSelect={() => go(item.href)}>
                      <Icon />
                      <span className="flex-1">{item.label}</span>
                      {item.soon ? <span className="text-caption text-muted-foreground">em breve</span> : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
