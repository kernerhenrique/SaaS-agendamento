/**
 * Forma canônica do telefone para gravar/comparar: só dígitos. É a chave de
 * deduplicação do cliente — "(11) 99999-0001" e "11999990001" são a mesma pessoa.
 */
export function normalizePhoneBR(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Dígitos no formato nacional (DDD + número). Tira o que vem a mais quando o número
 * é colado do WhatsApp ou preenchido pelo celular: o DDI ("+55 11 9…") e o zero de
 * discagem ("011 9…"). Sem isso, o corte em 11 dígitos guardava um número errado.
 */
export function nationalDigitsBR(value: string): string {
  const digits = value.replace(/\D/g, "").replace(/^0+/, "");
  return digits.length > 11 && digits.startsWith("55") ? digits.slice(2).replace(/^0+/, "") : digits;
}

/**
 * Aplica a máscara de telefone brasileiro enquanto o usuário digita.
 * Aceita até 11 dígitos (DDD + 9 dígitos de celular); com 10 formata como fixo.
 */
export function formatPhoneBR(value: string): string {
  const digits = nationalDigitsBR(value).slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
