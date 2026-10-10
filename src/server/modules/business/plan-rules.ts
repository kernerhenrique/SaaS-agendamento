import { LEGAL } from "@/config/brand";
import { formatPhoneBR } from "@/lib/phone";

/**
 * Limite do plano contratado (`Business.maxProfessionals`): quantos profissionais
 * ATIVOS o negócio pode ter. `null` = sem limite (todos os clientes anteriores aos
 * planos com limite, e as demonstrações). Definido pela Aprazzo na entrega
 * (`novo-cliente`) ou pelo suporte (`npm run limite-profissionais`); a tela nunca muda.
 */

/** Limites aceitos: Solo = 1; Modelo B = 3, 8 ou 15. Outros números também valem (proposta própria). */
export const PROFESSIONAL_LIMIT_RANGE = { min: 1, max: 500 } as const;

/** Cabe mais um profissional ativo? `activeCount` = ativos hoje, sem contar o que está sendo ativado. */
export function canActivateAnotherProfessional(activeCount: number, maxProfessionals: number | null): boolean {
  return maxProfessionals === null || activeCount < maxProfessionals;
}

export function professionalLimitMessage(maxProfessionals: number): string {
  const plano = maxProfessionals === 1 ? "1 profissional ativo" : `até ${maxProfessionals} profissionais ativos`;
  return `Seu plano permite ${plano}. Para ter mais, fale com a Aprazzo pelo WhatsApp ${formatPhoneBR(LEGAL.contactWhatsapp)} e mude de plano. Também dá para pausar alguém (desligar "Ativo") para ativar outra pessoa.`;
}

/**
 * Plano Solo (limite = 1 profissional): a página de reservas pula a escolha do profissional
 * e o painel esconde o que é de equipe. Depende só do PLANO, nunca da contagem: um negócio
 * de equipe com uma pessoa só cadastrada continua exatamente como era.
 */
export function isSoloPlan(maxProfessionals: number | null): boolean {
  return maxProfessionals === 1;
}

/** Valida o limite vindo do arquivo do cliente ou do comando de suporte. */
export function parseProfessionalLimit(value: unknown): number | null {
  if (value === null || value === undefined || value === "" || value === "sem") return null;
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isInteger(n) || n < PROFESSIONAL_LIMIT_RANGE.min || n > PROFESSIONAL_LIMIT_RANGE.max) {
    throw new Error(`Limite de profissionais inválido: "${String(value)}" (use um número inteiro a partir de 1, ou "sem")`);
  }
  return n;
}
