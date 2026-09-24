import { cookies } from "next/headers";

import { ACCESS_TOKEN_COOKIE } from "./cookies";
import { verifyAccessToken, type AccessTokenPayload } from "./tokens";

export interface AdminSession {
  userId: string;
  businessId: string;
  role: AccessTokenPayload["role"];
}

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
    return { userId: payload.sub, businessId: payload.businessId, role: payload.role };
  } catch {
    return null;
  }
}
