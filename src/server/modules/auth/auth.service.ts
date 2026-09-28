import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/server/db/prisma";
import { ValidationError } from "@/server/errors";

import { hashPassword, verifyPassword } from "./password";
import { newPasswordProblem } from "./password-rules";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "./tokens";

export interface AuthenticatedUser {
  id: string;
  businessId: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Mensagem de erro sempre genérica em falha de login — não revela se foi o
 * e-mail que não existe ou a senha que está errada, evitando enumeração de
 * contas cadastradas.
 */
const INVALID_CREDENTIALS_MESSAGE = "E-mail ou senha inválidos";

export async function login(
  email: string,
  password: string,
): Promise<{ user: AuthenticatedUser; tokens: AuthTokens }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new ValidationError(INVALID_CREDENTIALS_MESSAGE);
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    throw new ValidationError(INVALID_CREDENTIALS_MESSAGE);
  }

  const tokens = await issueTokens(user);
  return {
    user: {
      id: user.id,
      businessId: user.businessId,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    tokens,
  };
}

/**
 * Emite um par novo (access + refresh) a partir de um refresh token válido.
 * Rotacionar o refresh a cada uso dá a sessão deslizante: quem usa o painel
 * ao menos uma vez a cada 7 dias nunca precisa entrar de novo. O
 * `tokenVersion` do refresh precisa bater com o do banco: logout ou troca de
 * senha incrementa `User.tokenVersion` e invalida todos os refresh anteriores.
 */
export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  const payload = await verifyRefreshToken(refreshToken).catch(() => null);
  if (!payload) {
    throw new ValidationError("Refresh token inválido ou expirado");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.tokenVersion !== payload.tokenVersion) {
    throw new ValidationError("Refresh token inválido ou expirado");
  }

  return issueTokens(user);
}

/** Invalida todos os refresh tokens já emitidos para o usuário. */
export async function logout(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
}

export async function changePassword(userId: string, newPassword: string): Promise<{ tokenVersion: number }> {
  const passwordHash = await hashPassword(newPassword);
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash, tokenVersion: { increment: 1 } },
    select: { tokenVersion: true },
  });
}

/**
 * Troca de senha pelo próprio dono (Configurações → Conta). Exige a senha
 * atual. `changePassword` incrementa o `tokenVersion`, o que derruba as
 * outras sessões; esta recebe tokens novos e continua logada.
 */
export async function changeOwnPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<AuthTokens> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new ValidationError("Senha atual incorreta");
  }
  const problem = newPasswordProblem(currentPassword, newPassword);
  if (problem) throw new ValidationError(problem);

  const { tokenVersion } = await changePassword(userId, newPassword);
  return issueTokens({ ...user, tokenVersion });
}

async function issueTokens(user: {
  id: string;
  businessId: string;
  role: UserRole;
  tokenVersion: number;
}): Promise<AuthTokens> {
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken({
      userId: user.id,
      businessId: user.businessId,
      role: user.role,
    }),
    signRefreshToken({
      userId: user.id,
      businessId: user.businessId,
      tokenVersion: user.tokenVersion,
    }),
  ]);
  return { accessToken, refreshToken };
}
