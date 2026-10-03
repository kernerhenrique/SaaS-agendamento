import { BRAND } from "@/config/brand";
import { getAppBaseUrl } from "@/server/app-url";
import { prisma } from "@/server/db/prisma";
import { NotFoundError, ValidationError } from "@/server/errors";
import { sendEmail } from "@/server/modules/notification/email";
import { generateInviteToken, hashInviteToken, inviteState } from "@/server/modules/staff/staff-invite-rules";

import { changePassword, isAccessBlocked, issueTokens, type AuthTokens } from "./auth.service";
import { PASSWORD_RESET_TTL_MINUTES, resetPasswordProblem } from "./password-rules";

/**
 * "Esqueci minha senha": link de uso único (só o sha256 no banco), curto por
 * e-mail e mais longo pelo suporte. Nunca revela se o e-mail existe; usuário
 * revogado e o dono visitante da demonstração não recebem link.
 */

const GENERIC_RESET_ERROR = "Link inválido ou expirado. Peça um novo em “Esqueci minha senha”.";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

async function findResettableUser(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: { professional: { select: { deletedAt: true } }, business: { select: { name: true, isDemo: true, deletedAt: true } } },
  });
  if (!user || isAccessBlocked(user) || user.business.isDemo || user.business.deletedAt) return null;
  return user;
}

async function createResetLink(userId: string, ttlMinutes: number): Promise<{ url: string; expiresAt: Date }> {
  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  await prisma.$transaction([
    // Um link novo invalida os anteriores ainda não usados.
    prisma.passwordReset.deleteMany({ where: { userId, usedAt: null } }),
    prisma.passwordReset.create({ data: { userId, tokenHash: hashInviteToken(token), expiresAt } }),
  ]);
  return { url: `${getAppBaseUrl()}/admin/redefinir-senha/${token}`, expiresAt };
}

/** Pedido pela tela de login. Sempre "dá certo" para quem pede: a resposta não muda se o e-mail não existir. */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await findResettableUser(email);
  if (!user) return;
  const { url } = await createResetLink(user.id, PASSWORD_RESET_TTL_MINUTES.email);
  const text = [
    `Olá, ${user.name}!`,
    "",
    `Recebemos um pedido para redefinir a sua senha do painel de ${user.business.name}.`,
    `Crie uma senha nova por este link (vale por 1 hora e só funciona uma vez): ${url}`,
    "",
    "Se não foi você, ignore este e-mail: a sua senha continua a mesma.",
    `Equipe ${BRAND.name}`,
  ].join("\n");
  const html = `
    <p>Olá, ${escapeHtml(user.name)}!</p>
    <p>Recebemos um pedido para redefinir a sua senha do painel de <strong>${escapeHtml(user.business.name)}</strong>.</p>
    <p><a href="${url}"><strong>Criar uma senha nova</strong></a> (vale por 1 hora e só funciona uma vez).</p>
    <p>Se não foi você, ignore este e-mail: a sua senha continua a mesma.</p>
    <p>Equipe ${BRAND.name}</p>
  `;
  await sendEmail({ to: user.email, subject: `Redefinir senha — ${BRAND.name}`, html, text });
}

/** Suporte (`npm run link-senha`): o link para mandar pelo WhatsApp. Aqui pode dizer que o e-mail não existe. */
export async function createSupportResetLink(email: string): Promise<{ url: string; expiresAt: Date; name: string; businessName: string }> {
  const user = await findResettableUser(email);
  if (!user) throw new ValidationError(`Nenhum acesso ativo com o e-mail ${email} (ou é de uma demonstração)`);
  const link = await createResetLink(user.id, PASSWORD_RESET_TTL_MINUTES.support);
  return { ...link, name: user.name, businessName: user.business.name };
}

async function findValidReset(token: string) {
  const reset = await prisma.passwordReset.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    include: { user: { include: { professional: { select: { deletedAt: true } } } } },
  });
  if (!reset || inviteState(reset, new Date()) !== "valid" || isAccessBlocked(reset.user)) {
    throw new NotFoundError(GENERIC_RESET_ERROR);
  }
  return reset;
}

/** O que a página do link mostra antes do formulário. */
export async function getPasswordResetSummary(token: string): Promise<{ name: string }> {
  const reset = await findValidReset(token);
  return { name: reset.user.name };
}

/**
 * Grava a senha nova e já entra no painel. O link é "gasto" numa operação só
 * (dois cliques simultâneos não usam o mesmo link duas vezes) e o
 * `tokenVersion` sobe: todas as sessões abertas caem.
 */
export async function resetPasswordWithToken(token: string, newPassword: string): Promise<AuthTokens> {
  const problem = resetPasswordProblem(newPassword);
  if (problem) throw new ValidationError(problem);
  const reset = await findValidReset(token);

  const claimed = await prisma.passwordReset.updateMany({
    where: { id: reset.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) throw new NotFoundError(GENERIC_RESET_ERROR);

  const { tokenVersion } = await changePassword(reset.userId, newPassword);
  return issueTokens({ ...reset.user, tokenVersion });
}
