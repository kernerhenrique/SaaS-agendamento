import { SignJWT, jwtVerify, type JWTPayload } from "jose";

import { UserRole } from "@/generated/prisma/enums";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "7d";

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET não configurado");
  }
  return new TextEncoder().encode(secret);
}

export interface AccessTokenPayload extends JWTPayload {
  sub: string;
  businessId: string;
  role: UserRole;
  type: "access";
}

export interface RefreshTokenPayload extends JWTPayload {
  sub: string;
  businessId: string;
  tokenVersion: number;
  type: "refresh";
}

export function signAccessToken(payload: {
  userId: string;
  businessId: string;
  role: UserRole;
}): Promise<string> {
  return new SignJWT({ businessId: payload.businessId, role: payload.role, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(getSecretKey());
}

export function signRefreshToken(payload: {
  userId: string;
  businessId: string;
  tokenVersion: number;
}): Promise<string> {
  return new SignJWT({
    businessId: payload.businessId,
    tokenVersion: payload.tokenVersion,
    type: "refresh",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_TTL)
    .sign(getSecretKey());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, getSecretKey());
  if (payload.type !== "access") {
    throw new Error("Token não é um access token");
  }
  return payload as AccessTokenPayload;
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  const { payload } = await jwtVerify(token, getSecretKey());
  if (payload.type !== "refresh") {
    throw new Error("Token não é um refresh token");
  }
  return payload as RefreshTokenPayload;
}
