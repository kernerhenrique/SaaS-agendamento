import type { Weekday } from "@/generated/prisma/enums";

export interface ServiceOption {
  id: string;
  name: string;
}

export interface ProfessionalListItem {
  id: string;
  name: string;
  bio: string | null;
  photoUrl: string | null;
  workingHours: {
    weekday: Weekday;
    startMinute: number;
    endMinute: number;
    breakStartMinute: number | null;
    breakEndMinute: number | null;
  }[];
  professionalServices: { service: { id: string; name: string } }[];
}
