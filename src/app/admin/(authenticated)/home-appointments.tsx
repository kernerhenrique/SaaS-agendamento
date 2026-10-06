"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { cn } from "cn";

import { AppointmentDrawer } from "./agenda/appointment-drawer";
import type { ProfessionalOption } from "./agenda/types";

const OpenAppointmentContext = createContext<(id: string) => void>(() => {});

/**
 * Início: os agendamentos listados (Hoje, reservas novas, sem desfecho) abrem
 * o mesmo drawer da Agenda, sem sair da tela. Alterou algo → a página recarrega
 * os números do servidor.
 */
export function HomeAppointmentsProvider({
  timezone,
  professionals,
  children,
}: {
  timezone: string;
  professionals: ProfessionalOption[];
  children: ReactNode;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  return (
    <OpenAppointmentContext.Provider value={setSelectedId}>
      {children}
      <AppointmentDrawer
        appointmentId={selectedId}
        timezone={timezone}
        professionals={professionals}
        onClose={() => setSelectedId(null)}
        onChanged={() => router.refresh()}
      />
    </OpenAppointmentContext.Provider>
  );
}

/** Botão que abre o detalhe do agendamento no drawer. */
export function OpenAppointmentButton({
  appointmentId,
  label,
  className,
  children,
}: {
  appointmentId: string;
  /** Nome acessível (ex.: "Abrir agendamento de Lucas, 16:00"). */
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  const open = useContext(OpenAppointmentContext);
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => open(appointmentId)}
      className={cn(
        "rounded-md text-left transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
    >
      {children}
    </button>
  );
}
