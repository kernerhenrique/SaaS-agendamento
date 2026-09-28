/**
 * Preset de vertical: o que muda de um nicho para outro sem tocar em lógica.
 * O preset ativo vem de `Business.businessType`. Funcionalidade específica de
 * nicho entra aqui como feature flag — nunca como `if (barbearia)` nas telas.
 */

export type Gender = "m" | "f";

export interface Term {
  singular: string;
  plural: string;
  gender: Gender;
}

export interface VerticalTerms {
  professional: Term;
  service: Term;
  client: Term;
}

export interface VerticalFeatures {
  /** Galeria de fotos por profissional (admin + página pública). */
  portfolio: boolean;
  /** Serviço com preço "a partir de" (R$ X+). */
  priceFrom: boolean;
  /** Agrupar serviços por categoria. */
  serviceCategories: boolean;
  /** Comissão por profissional (% no cadastro, aba Comissões no Financeiro). */
  commissions: boolean;
}

/** Ícone do item de serviços no menu; mapeado para Lucide no client. */
export type ServiceIconKey = "scissors" | "sparkles" | "pen-tool" | "briefcase";

export interface VerticalPreset {
  key: string;
  label: string;
  terms: VerticalTerms;
  features: VerticalFeatures;
  serviceIcon: ServiceIconKey;
}

const m = (singular: string, plural: string): Term => ({ singular, plural, gender: "m" });

export const VERTICAL_PRESETS = {
  barbershop: {
    key: "barbershop",
    label: "Barbearia",
    terms: { professional: m("Barbeiro", "Barbeiros"), service: m("Serviço", "Serviços"), client: m("Cliente", "Clientes") },
    features: { portfolio: true, priceFrom: true, serviceCategories: true, commissions: true },
    serviceIcon: "scissors",
  },
  beauty_clinic: {
    key: "beauty_clinic",
    label: "Clínica de estética",
    terms: {
      professional: m("Especialista", "Especialistas"),
      service: m("Procedimento", "Procedimentos"),
      client: m("Cliente", "Clientes"),
    },
    features: { portfolio: true, priceFrom: true, serviceCategories: true, commissions: true },
    serviceIcon: "sparkles",
  },
  tattoo_studio: {
    key: "tattoo_studio",
    label: "Estúdio de tatuagem",
    terms: { professional: m("Tatuador", "Tatuadores"), service: m("Serviço", "Serviços"), client: m("Cliente", "Clientes") },
    features: { portfolio: true, priceFrom: true, serviceCategories: true, commissions: true },
    serviceIcon: "pen-tool",
  },
  generic: {
    key: "generic",
    label: "Genérico",
    terms: {
      professional: m("Profissional", "Profissionais"),
      service: m("Serviço", "Serviços"),
      client: m("Cliente", "Clientes"),
    },
    // Genérico (ex.: consultório de uma pessoa só): sem comissão por padrão.
    features: { portfolio: true, priceFrom: true, serviceCategories: true, commissions: false },
    serviceIcon: "briefcase",
  },
} satisfies Record<string, VerticalPreset>;

export type VerticalKey = keyof typeof VERTICAL_PRESETS;

/** Preset de uma chave; chave desconhecida cai no genérico (nunca quebra a tela). */
export function getVertical(key: string | null | undefined): VerticalPreset {
  return key && isVerticalKey(key) ? VERTICAL_PRESETS[key] : VERTICAL_PRESETS.generic;
}

export function isVerticalKey(key: string): key is VerticalKey {
  // hasOwn, não `in`: "toString" & cia. existem no protótipo de qualquer objeto.
  return Object.hasOwn(VERTICAL_PRESETS, key);
}

// --- Textos com concordância de gênero -------------------------------------

const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
const byGender = (term: Term, masculine: string, feminine: string) => (term.gender === "f" ? feminine : masculine);

/** "Novo barbeiro" / "Nova especialista" */
export const newLabel = (term: Term) => `${byGender(term, "Novo", "Nova")} ${lower(term.singular)}`;

/** "Editar barbeiro" */
export const editLabel = (term: Term) => `Editar ${lower(term.singular)}`;

/** "Nenhum barbeiro cadastrado ainda." */
export const emptyLabel = (term: Term) =>
  `${byGender(term, "Nenhum", "Nenhuma")} ${lower(term.singular)} ${byGender(term, "cadastrado", "cadastrada")} ainda.`;

/** "Selecione um barbeiro" */
export const selectLabel = (term: Term) => `Selecione ${byGender(term, "um", "uma")} ${lower(term.singular)}`;

/** "Escolha o barbeiro" */
export const chooseLabel = (term: Term) => `Escolha ${byGender(term, "o", "a")} ${lower(term.singular)}`;

/** "do cliente" — para "Nome do cliente" */
export const ofLabel = (term: Term) => `${byGender(term, "do", "da")} ${lower(term.singular)}`;

/** "Barbeiro mais requisitado" */
export const mostRequestedLabel = (term: Term) =>
  `${term.singular} mais ${byGender(term, "requisitado", "requisitada")}`;

/** "Outros serviços" — grupo sem categoria */
export const othersLabel = (term: Term) => `${byGender(term, "Outros", "Outras")} ${lower(term.plural)}`;

/** "Nenhum serviço disponível no momento." */
export const noneAvailableLabel = (term: Term) =>
  `${byGender(term, "Nenhum", "Nenhuma")} ${lower(term.singular)} disponível no momento.`;

export { lower as lowerTerm };
