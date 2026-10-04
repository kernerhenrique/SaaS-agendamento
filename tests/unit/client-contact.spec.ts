import { describe, expect, it } from "vitest";

import { normalizePhoneBR } from "@/lib/phone";
import {
  collectTags,
  deletedClientPhone,
  hasTag,
  matchesClientSearch,
  parseClientContact,
} from "@/server/modules/client/client-rules";

describe("corrigir o cadastro", () => {
  it("normaliza nome, WhatsApp (tira +55) e e-mail vazio", () => {
    expect(parseClientContact({ name: "  Ana   Souza ", phone: "+55 (11) 99887-6655", email: " " }, normalizePhoneBR)).toEqual({
      name: "Ana Souza",
      phone: "11998876655",
      email: null,
    });
  });

  it("recusa nome vazio, telefone sem DDD e e-mail inválido", () => {
    expect(() => parseClientContact({ name: "", phone: "11998876655", email: "" }, normalizePhoneBR)).toThrow(/nome/);
    expect(() => parseClientContact({ name: "Ana", phone: "99887-6655", email: "" }, normalizePhoneBR)).toThrow(/DDD/);
    expect(() => parseClientContact({ name: "Ana", phone: "11998876655", email: "ana@" }, normalizePhoneBR)).toThrow(/E-mail/);
  });
});

describe("tags na lista de clientes", () => {
  const clients = [
    { name: "Ana", phone: "11998876655", tags: ["VIP", "Prefere manhã"] },
    { name: "Bruno", phone: "11977776666", tags: ["vip"] },
    { name: "Caio", phone: "11966665555", tags: [] },
  ];

  it("a busca também acha pela tag, sem acento e sem caixa", () => {
    expect(clients.filter((c) => matchesClientSearch(c, "manha")).map((c) => c.name)).toEqual(["Ana"]);
    expect(clients.filter((c) => matchesClientSearch(c, "VIP")).map((c) => c.name)).toEqual(["Ana", "Bruno"]);
  });

  it("filtro por tag exata e lista de tags sem repetir", () => {
    expect(clients.filter((c) => hasTag(c, "Vip")).map((c) => c.name)).toEqual(["Ana", "Bruno"]);
    expect(clients.filter((c) => hasTag(c, null))).toHaveLength(3);
    expect(collectTags(clients)).toEqual(["Prefere manhã", "VIP"]);
  });
});

describe("cliente excluído", () => {
  it("o telefone vira um marcador único que nunca casa com busca nem com deduplicação", () => {
    const phone = deletedClientPhone("abc123");
    expect(phone).toBe("excluido-abc123");
    expect(normalizePhoneBR(phone)).toBe("123");
    expect(matchesClientSearch({ name: "Cliente excluído", phone, tags: [] }, "11998876655")).toBe(false);
  });
});
