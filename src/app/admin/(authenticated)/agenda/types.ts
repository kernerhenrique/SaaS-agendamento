import type { AppointmentStatus, Weekday } from "@/generated/prisma/enums";
import type { PaymentStatus } from "@/server/modules/payment/payment-rules";

export interface WorkingHoursEntry {
  weekday: Weekday;
  startMinute: number;
  endMinute: number;
  breakStartMinute: number | null;
  breakEndMinute: number | null;
}

export interface ProfessionalOption {
  id: string;
  name: string;
  photoUrl: string | null;
  /** Chave da paleta (src/lib/professional-colors.ts). */
  color: string | null;
  services: { id: string; name: string; durationMin: number }[];
  workingHours: WorkingHoursEntry[];
}

export interface AppointmentDto {
  id: string;
  status: AppointmentStatus;
  startAt: string;
  endAt: string;
  professional: { id: string; name: string };
  service: { id: string; name: string; durationMin: number };
  client: { id: string; name: string; phone: string };
  /** Só para concluídos; null nos demais. */
  paymentStatus: PaymentStatus | null;
}

export interface TimeBlockDto {
  id: string;
  professionalId: string;
  startAt: string;
  endAt: string;
  reason: string | null;
}
