import { createHash, randomBytes } from "node:crypto";

import { ValidationError } from "@/server/errors";
import { MIN_PASSWORD_LENGTH } from "@/server/modules/auth/password-rules";

/**
 * Convite de acesso ao painel para um profissional. O link leva um token
 * aleatório; no banco fica só o hash (sha256), como uma senha: quem lê o
 * banco não consegue montar o link.
 */

export const INVITE_TTL_DAYS = 7;

/** Token do link: 32 bytes aleatórios em base64url (sem caracteres que quebram URL). */
export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function inviteExpiresAt(now: Date): Date {
  return new Date(now.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export type InviteState = "valid" | "expired" | "used";

export function inviteState(invite: { expiresAt: Date; usedAt: Date | null }, now: Date): InviteState {
  if (invite.usedAt) return "used";
  if (invite.expiresAt.getTime() <= now.getTime()) return "expired";
  return "valid";
}

export interface InviteAcceptance {
  name: string;
  email: string;
  password: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Dados que o profissional preenche ao aceitar: nome, e-mail (login) e senha. */
export function parseInviteAcceptance(body: unknown): InviteAcceptance {
  const record = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const email = typeof record.email === "string" ? record.email.trim().toLowerCase() : "";
  const password = typeof record.password === "string" ? record.password : "";
  if (!name) throw new ValidationError("Informe seu nome");
  if (name.length > 80) throw new ValidationError("O nome pode ter no máximo 80 caracteres");
  if (!EMAIL_PATTERN.test(email) || email.length > 200) throw new ValidationError("Informe um e-mail válido");
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError(`A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`);
  }
  if (new TextEncoder().encode(password).length > 72) throw new ValidationError("A senha é longa demais");
  return { name, email, password };
}
