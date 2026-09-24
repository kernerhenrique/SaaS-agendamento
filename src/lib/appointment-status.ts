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
