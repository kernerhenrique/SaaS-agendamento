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

/**
 * Estilo dos blocos na grade da agenda: fundo suave + faixa à esquerda na cor
 * do status (tokens --status-*), com texto na cor normal para manter contraste.
 * A mistura com --color-card é opaca de propósito: as linhas de hora da grade
 * não podem aparecer através do bloco.
 */
export const STATUS_BLOCK_CLASSES: Record<AppointmentStatus, string> = {
  PENDING: "border-l-4 border-status-scheduled bg-[color-mix(in_oklch,var(--color-status-scheduled)_16%,var(--color-card))] text-foreground",
  CONFIRMED: "border-l-4 border-status-confirmed bg-[color-mix(in_oklch,var(--color-status-confirmed)_16%,var(--color-card))] text-foreground",
  CANCELLED: "border-l-4 border-status-cancelled bg-muted text-muted-foreground line-through",
  COMPLETED: "border-l-4 border-status-completed bg-[color-mix(in_oklch,var(--color-status-completed)_16%,var(--color-card))] text-foreground",
  NO_SHOW: "border-l-4 border-status-no-show bg-[color-mix(in_oklch,var(--color-status-no-show)_16%,var(--color-card))] text-foreground",
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
