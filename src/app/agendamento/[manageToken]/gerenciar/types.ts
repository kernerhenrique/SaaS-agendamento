import type { AppointmentStatus } from "@/generated/prisma/enums";

export interface ManagedAppointment {
  status: AppointmentStatus;
  startAt: string;
  endAt: string;
  business: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
    address: string | null;
    whatsapp: string | null;
    maxBookingWindowDays: number;
    cancellationDeadlineHours: number;
  };
  professional: { id: string; name: string };
  service: { id: string; name: string; durationMin: number };
  client: { name: string };
}

/** Horário fixo visto pelo cliente: próximas datas e se cada uma ainda pode ser cancelada pelo link. */
export interface ClientSeries {
  frequencyWeeks: number;
  upcoming: { id: string; startAt: string; canCancel: boolean }[];
}
