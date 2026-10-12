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

describe("buildWhatsAppUrl com DDD 55", () => {
  it("põe o DDI também em telefone do DDD 55 (interior do RS)", () => {
    expect(buildWhatsAppUrl("(55) 99999-1234")).toBe("https://wa.me/5555999991234");
    expect(buildWhatsAppUrl("5532221234")).toBe("https://wa.me/555532221234");
    expect(buildWhatsAppUrl("+55 55 99999-1234")).toBe("https://wa.me/5555999991234");
  });
});
