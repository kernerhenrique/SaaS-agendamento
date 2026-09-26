"use client";

import { Plus } from "lucide-react";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";

import { useAdminShell } from "./admin-shell-context";
import type { NewAppointmentInitial } from "./new-appointment-dialog";

/** Botão que abre o novo agendamento global — utilizável dentro de server components. */
export function NewAppointmentButton({
  initial,
  label = "Novo agendamento",
  ...buttonProps
}: { initial?: NewAppointmentInitial; label?: string } & Omit<ComponentProps<typeof Button>, "onClick">) {
  const { openNewAppointment } = useAdminShell();
  return (
    <Button {...buttonProps} onClick={() => openNewAppointment(initial)}>
      <Plus />
      {label}
    </Button>
  );
}
