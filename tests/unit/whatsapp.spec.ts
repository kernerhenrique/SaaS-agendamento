import { describe, expect, it } from "vitest";

import { buildWhatsAppUrl } from "@/lib/whatsapp";

describe("buildWhatsAppUrl", () => {
  it("adiciona o DDI 55 quando o número não tem", () => {
    expect(buildWhatsAppUrl("11987654321")).toBe("https://wa.me/5511987654321");
  });

  it("não duplica o DDI quando o número já tem", () => {
    expect(buildWhatsAppUrl("5511987654321")).toBe("https://wa.me/5511987654321");
  });

  it("remove máscara/formatação do telefone", () => {
    expect(buildWhatsAppUrl("(11) 98765-4321")).toBe("https://wa.me/5511987654321");
  });

  it("inclui mensagem pré-definida codificada na URL", () => {
    expect(buildWhatsAppUrl("11987654321", "Olá!")).toBe("https://wa.me/5511987654321?text=Ol%C3%A1!");
  });
});
