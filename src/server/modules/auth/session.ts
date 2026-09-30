import { cookies } from "next/headers";

import { ForbiddenError, UnauthorizedError } from "@/server/errors";

import { ACCESS_TOKEN_COOKIE } from "./cookies";
import { can, type Access, type Permission } from "./permissions";
import { verifyAccessToken } from "./tokens";

/** Sessão do painel: quem é, de qual negócio, e o que pode (ver permissions.ts). */
export type AdminSession = Access;

/**
 * Lê e valida o access token do cookie da requisição atual. Retorna `null`
 * quando não há sessão válida — nunca lança para "não autenticado", já que
 * esse é um caso esperado (usuário deslogado), não um erro.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return null;

  try {
    const payload = await verifyAccessToken(token);
    return {
      userId: payload.sub,
      businessId: payload.businessId,
      role: payload.role,
      professionalId: payload.professionalId ?? null,
    };
  } catch {
    return null;
  }
}

/** Mesma coisa que `getAdminSession`, mas lança quando não há sessão — para
 * usar no topo de route handlers que exigem um admin autenticado. */
export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    throw new UnauthorizedError();
  }
  return session;
}

/** Sessão com uma permissão específica (403 para quem não tem). */
export async function requirePermission(permission: Permission): Promise<AdminSession> {
  const session = await requireAdminSession();
  if (!can(session.role, permission)) throw new ForbiddenError();
  return session;
}
