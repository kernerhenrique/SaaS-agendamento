import { describe, expect, it } from "vitest";

import { isOwnBlobUrl, MAX_IMAGE_BYTES, validateImageUpload } from "@/server/modules/business/business-images";

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

  it("só apaga do Blob imagens nossas (links externos antigos ficam)", () => {
    expect(isOwnBlobUrl("https://abc123.public.blob.vercel-storage.com/clientes/x/logo-1.png")).toBe(true);
    expect(isOwnBlobUrl("https://instagram.com/foto.jpg")).toBe(false);
    expect(isOwnBlobUrl("não é link")).toBe(false);
    expect(isOwnBlobUrl(null)).toBe(false);
  });
});
