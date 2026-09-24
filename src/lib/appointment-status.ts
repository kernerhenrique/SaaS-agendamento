import { AppointmentStatus } from "@/generated/prisma/enums";

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  CANCELLED: "Cancelado",
  COMPLETED: "Concluído",
  NO_SHOW: "Não compareceu",
};

export const STATUS_BADGE_CLASSES: Record<AppointmentStatus, string> = {
  PENDING: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  CONFIRMED: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  CANCELLED: "border-muted-foreground/30 bg-muted text-muted-foreground",
  COMPLETED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  NO_SHOW: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
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
