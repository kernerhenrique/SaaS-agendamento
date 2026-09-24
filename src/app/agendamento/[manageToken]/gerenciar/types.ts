import type { AppointmentStatus } from "@/generated/prisma/enums";

export interface ManagedAppointment {
  status: AppointmentStatus;
  startAt: string;
  endAt: string;
  business: { id: string; name: string; timezone: string; address: string | null };
  professional: { id: string; name: string };
  service: { id: string; name: string; durationMin: number };
  client: { name: string };
  review: { rating: number; comment: string | null } | null;
}
