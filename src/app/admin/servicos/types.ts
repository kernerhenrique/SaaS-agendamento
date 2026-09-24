export interface ProfessionalOption {
  id: string;
  name: string;
}

export interface ServiceListItem {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceCents: number;
  professionalServices: { professional: { id: string; name: string } }[];
}
