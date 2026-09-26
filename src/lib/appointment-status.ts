import type { StatusTone } from "@/components/status-badge";
import { AppointmentStatus } from "@/generated/prisma/enums";

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  CANCELLED: "Cancelado",
  COMPLETED: "Concluído",
  NO_SHOW: "Não compareceu",
};

/** Tom do `StatusBadge` (tokens --status-*) para cada status. */
export const STATUS_TONE: Record<AppointmentStatus, StatusTone> = {
  PENDING: "scheduled",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  NO_SHOW: "no-show",
};

/** Versão "bloco cheio" das cores por status, usada na grade de horários da
 * agenda (fundo sólido, não só borda/texto como STATUS_BADGE_CLASSES). */
export const STATUS_BLOCK_CLASSES: Record<AppointmentStatus, string> = {
  PENDING: "bg-amber-500 text-white",
  CONFIRMED: "bg-blue-500 text-white",
  CANCELLED: "bg-muted text-muted-foreground line-through ring-1 ring-border",
  COMPLETED: "bg-emerald-500 text-white",
  NO_SHOW: "bg-red-500 text-white",
};

export const NEXT_STATUS_ACTIONS: Record<AppointmentStatus, { status: AppointmentStatus; label: string }[]> = {
  PENDING: [
    { status: AppointmentStatus.CONFIRMED, label: "Confirmar" },
    { status: AppointmentStatus.CANCELLED, label: "Cancelar" },
  ],
  CONFIRMED: [
    { status: AppointmentStatus.COMPLETED, label: "Concluir" },
    { status: AppointmentStatus.NO_SHOW, label: "Não compareceu" },
    { status: AppointmentStatus.CANCELLED, label: "Cancelar" },
  ],
  CANCELLED: [],
  COMPLETED: [],
  NO_SHOW: [],
};
