export interface ProfessionalOption {
  id: string;
  name: string;
}

export interface ServiceCategoryOption {
  id: string;
  name: string;
}

export interface ServiceListItem {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceCents: number;
  priceType: "FIXED" | "FROM";
  categoryId: string | null;
  category: ServiceCategoryOption | null;
  professionalServices: { professional: { id: string; name: string } }[];
}
