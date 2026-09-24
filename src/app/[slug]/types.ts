export interface BusinessInfo {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  address: string | null;
  accentColor: string | null;
}

export interface ServiceOption {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceCents: number;
}

export interface ProfessionalOption {
  id: string;
  name: string;
  photoUrl: string | null;
  serviceIds: string[];
}

export const NO_PREFERENCE = "no-preference" as const;

export interface AvailableSlot {
  professionalId: string;
  startAt: string;
  endAt: string;
}

export interface BookingSelection {
  service: ServiceOption | null;
  professionalId: string | typeof NO_PREFERENCE | null;
  date: string | null;
  slot: AvailableSlot | null;
}
