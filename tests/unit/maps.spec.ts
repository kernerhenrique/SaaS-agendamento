import { describe, expect, it } from "vitest";

import { buildGoogleMapsUrl } from "@/lib/maps";

describe("buildGoogleMapsUrl", () => {
  it("monta a URL de busca do Google Maps com o endereço codificado", () => {
    expect(buildGoogleMapsUrl("Rua das Tesouras, 123 - São Paulo/SP")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Rua%20das%20Tesouras%2C%20123%20-%20S%C3%A3o%20Paulo%2FSP",
    );
  });
});
