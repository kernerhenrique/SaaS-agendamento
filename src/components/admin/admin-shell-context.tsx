"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { CommandPalette } from "./command-palette";
import { NewAppointmentDialog, type NewAppointmentInitial } from "./new-appointment-dialog";

interface AdminShellContextValue {
  timezone: string;
  /** Página de reservas do negócio ("/{slug}"): atalho "Ver minha página". */
  publicPath: string;
  /** Plano Solo (limite = 1 profissional): o painel esconde o que é de equipe. */
  solo: boolean;
  /** Abre o "novo agendamento" de qualquer tela, opcionalmente já preenchido. */
  openNewAppointment: (initial?: NewAppointmentInitial) => void;
  /** Muda a cada agendamento criado — telas que listam agendamentos recarregam ao ver a mudança. */
  appointmentsVersion: number;
  openSearch: () => void;
  /**
   * Data que a tela atual está mostrando (a agenda registra o dia visível):
   * o "+ Novo agendamento" da barra superior abre já nesse dia.
   */
  setContextDate: (date: string | undefined) => void;
}

const AdminShellContext = createContext<AdminShellContextValue | null>(null);

export function AdminShellProvider({
  timezone,
  publicPath,
  solo = false,
  children,
}: {
  timezone: string;
  publicPath: string;
  solo?: boolean;
  children: ReactNode;
}) {
  const [newAppointment, setNewAppointment] = useState<{ open: boolean; initial?: NewAppointmentInitial }>({
    open: false,
  });
  const [appointmentsVersion, setAppointmentsVersion] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [contextDate, setContextDate] = useState<string | undefined>();

  const openNewAppointment = useCallback(
    (initial?: NewAppointmentInitial) => {
      setNewAppointment({ open: true, initial: { date: contextDate, ...initial } });
    },
    [contextDate],
  );
  const openSearch = useCallback(() => setIsSearchOpen(true), []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const value = useMemo(
    () => ({ timezone, publicPath, solo, openNewAppointment, appointmentsVersion, openSearch, setContextDate }),
    [timezone, publicPath, solo, openNewAppointment, appointmentsVersion, openSearch],
  );

  return (
    <AdminShellContext.Provider value={value}>
      {children}
      <NewAppointmentDialog
        open={newAppointment.open}
        initial={newAppointment.initial}
        timezone={timezone}
        solo={solo}
        onOpenChange={(open) => setNewAppointment((prev) => ({ ...prev, open }))}
        onCreated={() => setAppointmentsVersion((v) => v + 1)}
      />
      <CommandPalette open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </AdminShellContext.Provider>
  );
}

export function useAdminShell(): AdminShellContextValue {
  const context = useContext(AdminShellContext);
  if (!context) throw new Error("useAdminShell precisa estar dentro de AdminShellProvider");
  return context;
}
