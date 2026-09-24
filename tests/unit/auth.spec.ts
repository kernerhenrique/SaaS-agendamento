import { beforeAll, describe, expect, it } from "vitest";

import { UserRole } from "@/generated/prisma/enums";
import { hashPassword, verifyPassword } from "@/server/modules/auth/password";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "@/server/modules/auth/tokens";

beforeAll(() => {
  process.env.JWT_SECRET ??= "test-secret-nao-usar-em-producao";
});

describe("password", () => {
  it("gera um hash diferente da senha em texto puro e verifica corretamente", async () => {
    const hash = await hashPassword("minha-senha-123");
    expect(hash).not.toBe("minha-senha-123");
    expect(await verifyPassword("minha-senha-123", hash)).toBe(true);
    expect(await verifyPassword("senha-errada", hash)).toBe(false);
  });
});

describe("tokens", () => {
  it("assina e verifica um access token, preservando os claims", async () => {
    const token = await signAccessToken({
      userId: "user_1",
      businessId: "biz_1",
      role: UserRole.OWNER,
    });

    const payload = await verifyAccessToken(token);
    expect(payload.sub).toBe("user_1");
    expect(payload.businessId).toBe("biz_1");
    expect(payload.role).toBe(UserRole.OWNER);
    expect(payload.type).toBe("access");
  });

  it("assina e verifica um refresh token, preservando o tokenVersion", async () => {
    const token = await signRefreshToken({
      userId: "user_1",
      businessId: "biz_1",
      tokenVersion: 3,
    });

    const payload = await verifyRefreshToken(token);
    expect(payload.sub).toBe("user_1");
    expect(payload.tokenVersion).toBe(3);
    expect(payload.type).toBe("refresh");
  });

  it("rejeita um refresh token passado para verifyAccessToken (mistura de tipos)", async () => {
    const refreshToken = await signRefreshToken({
      userId: "user_1",
      businessId: "biz_1",
      tokenVersion: 0,
    });

    await expect(verifyAccessToken(refreshToken)).rejects.toThrow();
  });

  it("rejeita um token expirado", async () => {
    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const expiredToken = await new SignJWT({ businessId: "biz_1", role: UserRole.OWNER, type: "access" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user_1")
      .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(secret);

    await expect(verifyAccessToken(expiredToken)).rejects.toThrow();
  });

  it("rejeita um token assinado com outro segredo", async () => {
    const { SignJWT } = await import("jose");
    const wrongSecret = new TextEncoder().encode("outro-segredo-completamente-diferente");
    const tamperedToken = await new SignJWT({ businessId: "biz_1", role: UserRole.OWNER, type: "access" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user_1")
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(wrongSecret);

    await expect(verifyAccessToken(tamperedToken)).rejects.toThrow();
  });
});
