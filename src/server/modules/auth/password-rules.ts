export const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72; // limite do bcrypt: o que passa disso é ignorado

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
