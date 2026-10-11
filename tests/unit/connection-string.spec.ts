import { describe, expect, it } from "vitest";

import { withExplicitSslMode } from "@/server/db/connection-string";

describe("withExplicitSslMode (tira o aviso do pg sem mudar o comportamento)", () => {
  it("require vira verify-full, mantendo o resto da string", () => {
    expect(withExplicitSslMode("postgresql://u:p@host/db?sslmode=require&channel_binding=require")).toBe(
      "postgresql://u:p@host/db?sslmode=verify-full&channel_binding=require",
    );
    expect(withExplicitSslMode("postgresql://u:p@host/db?connect_timeout=10&sslmode=prefer")).toBe(
      "postgresql://u:p@host/db?connect_timeout=10&sslmode=verify-full",
    );
  });
  it("sem sslmode (banco local) ou já verify-full: não mexe", () => {
    expect(withExplicitSslMode("postgresql://u:p@localhost:5432/db?schema=public")).toBe("postgresql://u:p@localhost:5432/db?schema=public");
    expect(withExplicitSslMode("postgresql://u:p@host/db?sslmode=verify-full")).toBe("postgresql://u:p@host/db?sslmode=verify-full");
    expect(withExplicitSslMode("postgresql://u:p@host/db?sslmode=disable")).toBe("postgresql://u:p@host/db?sslmode=disable");
    expect(withExplicitSslMode(undefined)).toBeUndefined();
  });
});
