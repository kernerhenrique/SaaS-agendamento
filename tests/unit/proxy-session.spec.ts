import { describe, expect, it, vi } from "vitest";

import { resolveProxySession } from "@/server/modules/auth/proxy-session";

const tokens = { accessToken: "novo-access", refreshToken: "novo-refresh" };
const ok = () => Promise.resolve({});
const fail = () => Promise.reject(new Error("inválido"));

describe("resolveProxySession", () => {
  it("access válido segue sem tocar no refresh", async () => {
    const refreshTokens = vi.fn();
    const result = await resolveProxySession(
      { accessToken: "a", refreshToken: "r" },
      { verifyAccessToken: ok, refreshTokens },
    );
    expect(result).toEqual({ status: "valid" });
    expect(refreshTokens).not.toHaveBeenCalled();
  });

  it("access expirado com refresh válido renova (tokens novos)", async () => {
    const result = await resolveProxySession(
      { accessToken: "expirado", refreshToken: "r" },
      { verifyAccessToken: fail, refreshTokens: () => Promise.resolve(tokens) },
    );
    expect(result).toEqual({ status: "refreshed", tokens });
  });

  it("sem access mas com refresh válido também renova", async () => {
    const result = await resolveProxySession(
      { refreshToken: "r" },
      { verifyAccessToken: fail, refreshTokens: () => Promise.resolve(tokens) },
    );
    expect(result.status).toBe("refreshed");
  });

  it("refresh revogado (logout/troca de senha) ou expirado → anônimo", async () => {
    const result = await resolveProxySession(
      { accessToken: "expirado", refreshToken: "revogado" },
      { verifyAccessToken: fail, refreshTokens: fail },
    );
    expect(result).toEqual({ status: "anonymous" });
  });

  it("sem cookie nenhum → anônimo", async () => {
    const result = await resolveProxySession({}, { verifyAccessToken: fail, refreshTokens: fail });
    expect(result).toEqual({ status: "anonymous" });
  });
});
