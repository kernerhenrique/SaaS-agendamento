import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/server/db/prisma";
import { ValidationError } from "@/server/errors";

import { hashPassword, verifyPassword } from "./password";
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
 * Emite um novo access token a partir de um refresh token válido. O
 * `tokenVersion` do refresh precisa bater com o do banco: um logout ou troca
 * de senha incrementa `User.tokenVersion`, invalidando de uma vez todos os
 * refresh tokens emitidos antes disso.
 */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const payload = await verifyRefreshToken(refreshToken).catch(() => null);
  if (!payload) {
    throw new ValidationError("Refresh token inválido ou expirado");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.tokenVersion !== payload.tokenVersion) {
    throw new ValidationError("Refresh token inválido ou expirado");
  }

  return signAccessToken({ userId: user.id, businessId: user.businessId, role: user.role });
}

/** Invalida todos os refresh tokens já emitidos para o usuário. */
export async function logout(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
}

export async function changePassword(userId: string, newPassword: string): Promise<void> {
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, tokenVersion: { increment: 1 } },
  });
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
