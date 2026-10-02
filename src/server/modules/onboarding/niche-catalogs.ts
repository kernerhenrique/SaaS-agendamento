import type { VerticalKey } from "@/config/vertical";

/**
 * Catálogo inicial de cada nicho: usado quando o arquivo do cliente não traz
 * a lista de serviços (o dono ajusta depois em Serviços) e pela demo.
 * Preços em centavos, valores típicos do mercado brasileiro em 2026.
 */
export interface CatalogService {
  name: string;
  category: string;
  durationMin: number;
  priceCents: number;
  priceFrom?: boolean;
  description?: string;
}

export const NICHE_CATALOGS: Record<VerticalKey, CatalogService[]> = {
  barbershop: [
    { name: "Corte de cabelo", category: "Cabelo", durationMin: 30, priceCents: 4500, description: "Corte na tesoura ou máquina, com acabamento" },
    { name: "Corte infantil", category: "Cabelo", durationMin: 30, priceCents: 3500, description: "Para crianças até 12 anos" },
    { name: "Pigmentação", category: "Cabelo", durationMin: 40, priceCents: 5000, priceFrom: true },
    { name: "Barba", category: "Barba", durationMin: 30, priceCents: 3500, description: "Barba com toalha quente e navalha" },
    { name: "Corte e barba", category: "Barba", durationMin: 60, priceCents: 7000 },
    { name: "Sobrancelha", category: "Barba", durationMin: 15, priceCents: 1500 },
  ],
  beauty_clinic: [
    { name: "Limpeza de pele", category: "Facial", durationMin: 60, priceCents: 15000, description: "Higienização, extração e máscara calmante" },
    { name: "Peeling químico", category: "Facial", durationMin: 45, priceCents: 22000, priceFrom: true },
    { name: "Design de sobrancelha", category: "Facial", durationMin: 30, priceCents: 5000 },
    { name: "Drenagem linfática", category: "Corporal", durationMin: 60, priceCents: 13000 },
    { name: "Massagem modeladora", category: "Corporal", durationMin: 60, priceCents: 14000 },
    { name: "Avaliação", category: "Avaliação", durationMin: 30, priceCents: 8000, description: "Análise da pele para indicar o melhor procedimento" },
  ],
  tattoo_studio: [
    { name: "Tatuagem pequena", category: "Tatuagem", durationMin: 60, priceCents: 25000, priceFrom: true, description: "Até 7 cm, traço fino" },
    { name: "Tatuagem média", category: "Tatuagem", durationMin: 180, priceCents: 60000, priceFrom: true },
    { name: "Sessão de fechamento", category: "Tatuagem", durationMin: 300, priceCents: 120000, priceFrom: true, description: "Sessão longa para projetos grandes" },
    { name: "Retoque", category: "Tatuagem", durationMin: 60, priceCents: 10000, priceFrom: true },
    { name: "Consultoria de projeto", category: "Atendimento", durationMin: 30, priceCents: 5000, description: "Conversa sobre a ideia, tamanho e local" },
    { name: "Piercing", category: "Piercing", durationMin: 30, priceCents: 12000, priceFrom: true },
  ],
  generic: [
    { name: "Atendimento", category: "Atendimentos", durationMin: 60, priceCents: 15000 },
    { name: "Primeira consulta", category: "Atendimentos", durationMin: 60, priceCents: 18000 },
    { name: "Retorno", category: "Atendimentos", durationMin: 30, priceCents: 9000 },
  ],
};
