export const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72; // limite do bcrypt: o que passa disso é ignorado

/** Regras da senha nova na recuperação ("Esqueci minha senha"): sem a atual para comparar. */
export function resetPasswordProblem(newPassword: string): string | null {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return `A nova senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }
  if (new TextEncoder().encode(newPassword).length > MAX_PASSWORD_LENGTH) {
    return "A nova senha é longa demais";
  }
  return null;
}

/** Validade do link: curta por e-mail; maior quando o suporte manda pelo WhatsApp (`npm run link-senha`). */
export const PASSWORD_RESET_TTL_MINUTES = { email: 60, support: 24 * 60 } as const;

/** Regras da nova senha na troca feita pelo dono. Devolve a mensagem de erro ou null. */
export function newPasswordProblem(currentPassword: string, newPassword: string): string | null {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return `A nova senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }
  if (new TextEncoder().encode(newPassword).length > MAX_PASSWORD_LENGTH) {
    return "A nova senha é longa demais";
  }
  if (newPassword === currentPassword) {
    return "A nova senha precisa ser diferente da atual";
  }
  return null;
}
