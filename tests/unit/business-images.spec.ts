import { describe, expect, it } from "vitest";

import { isBlobConfigured, isOwnBlobUrl, MAX_IMAGE_BYTES, validateImageUpload } from "@/server/modules/business/business-images";

describe("envio de logo e capa", () => {
  it("aceita PNG, JPG e WebP até 4 MB e devolve a extensão", () => {
    expect(validateImageUpload("image/png", 1000)).toBe("png");
    expect(validateImageUpload("image/jpeg", MAX_IMAGE_BYTES)).toBe("jpg");
    expect(validateImageUpload("image/webp", 10)).toBe("webp");
  });

  it("recusa SVG, PDF, arquivo vazio e acima de 4 MB", () => {
    expect(() => validateImageUpload("image/svg+xml", 1000)).toThrow(/PNG, JPG ou WebP/);
    expect(() => validateImageUpload("application/pdf", 1000)).toThrow(/PNG, JPG ou WebP/);
    expect(() => validateImageUpload("image/png", 0)).toThrow(/vazio/);
    expect(() => validateImageUpload("image/png", MAX_IMAGE_BYTES + 1)).toThrow(/4 MB/);
  });

  it("na Vercel basta o BLOB_STORE_ID (o token vem na requisição); fora dela precisa do token", () => {
    expect(isBlobConfigured({ BLOB_STORE_ID: "store", VERCEL: "1" })).toBe(true);
    expect(isBlobConfigured({ BLOB_STORE_ID: "store" })).toBe(false);
    expect(isBlobConfigured({ BLOB_STORE_ID: "store", VERCEL_OIDC_TOKEN: "t" })).toBe(true);
    expect(isBlobConfigured({ BLOB_READ_WRITE_TOKEN: "t" })).toBe(true);
    expect(isBlobConfigured({ VERCEL: "1" })).toBe(false);
  });

  it("só apaga do Blob imagens nossas (links externos antigos ficam)", () => {
    expect(isOwnBlobUrl("https://abc123.public.blob.vercel-storage.com/clientes/x/logo-1.png")).toBe(true);
    expect(isOwnBlobUrl("https://instagram.com/foto.jpg")).toBe(false);
    expect(isOwnBlobUrl("não é link")).toBe(false);
    expect(isOwnBlobUrl(null)).toBe(false);
  });
});
