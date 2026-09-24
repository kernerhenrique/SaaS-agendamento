import type { AppointmentStatus, Weekday } from "@/generated/prisma/enums";

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
}

export interface TimeBlockDto {
  id: string;
  professionalId: string;
  startAt: string;
  endAt: string;
  reason: string | null;
}
