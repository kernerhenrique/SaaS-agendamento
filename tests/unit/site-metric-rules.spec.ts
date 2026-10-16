import { describe, expect, it } from "vitest";

import { classifyVisitSource, parseMetric, shouldCountVisitor } from "@/lib/site-metric-rules";

describe("parseMetric", () => {
  it("aceita só eventos e detalhes da lista", () => {
    expect(parseMetric({ event: "site_visit", label: "instagram" })).toEqual({ event: "site_visit", label: "instagram" });
    expect(parseMetric({ event: "whatsapp_click", label: "hero" })).toEqual({ event: "whatsapp_click", label: "hero" });
    expect(parseMetric({ event: "whatsapp_click", label: "demo-painel" })).toEqual({ event: "whatsapp_click", label: "demo-painel" });
    expect(parseMetric({ event: "demo_open", label: "barbearia-do-ze-demo" })).toEqual({ event: "demo_open", label: "barbearia-do-ze-demo" });
  });

  it("normaliza maiúsculas e espaços do detalhe", () => {
    expect(parseMetric({ event: "site_visit", label: " Instagram " })).toEqual({ event: "site_visit", label: "instagram" });
  });

  it("descarta evento desconhecido, detalhe fora da lista e corpo torto", () => {
    expect(parseMetric({ event: "compra", label: "hero" })).toBeNull();
    expect(parseMetric({ event: "site_visit", label: "tiktok" })).toBeNull();
    expect(parseMetric({ event: "whatsapp_click", label: "botao-inventado" })).toBeNull();
    expect(parseMetric({ event: "whatsapp_click" })).toBeNull();
    expect(parseMetric({ event: "demo_open", label: "com espaço e <tag>" })).toBeNull();
    expect(parseMetric(null)).toBeNull();
    expect(parseMetric("site_visit")).toBeNull();
  });
});

describe("classifyVisitSource", () => {
  const ownHost = "aprazzo.com.br";

  it("a marcação do link vale mais que a origem informada pelo navegador", () => {
    expect(classifyVisitSource({ utmSource: "instagram", referrer: "https://www.google.com/", ownHost })).toBe("instagram");
    expect(classifyVisitSource({ utmSource: "LinkedIn", referrer: "", ownHost })).toBe("linkedin");
    expect(classifyVisitSource({ utmSource: "panfleto", referrer: "", ownHost })).toBe("outro");
  });

  it("sem marcação, olha de onde a pessoa veio", () => {
    expect(classifyVisitSource({ referrer: "https://l.instagram.com/?u=x", ownHost })).toBe("instagram");
    expect(classifyVisitSource({ referrer: "https://www.linkedin.com/feed/", ownHost })).toBe("linkedin");
    expect(classifyVisitSource({ referrer: "https://lnkd.in/abc", ownHost })).toBe("linkedin");
    expect(classifyVisitSource({ referrer: "https://web.whatsapp.com/", ownHost })).toBe("whatsapp");
    expect(classifyVisitSource({ referrer: "https://m.facebook.com/", ownHost })).toBe("facebook");
    expect(classifyVisitSource({ referrer: "https://www.google.com.br/search?q=aprazzo", ownHost })).toBe("google");
    expect(classifyVisitSource({ referrer: "https://blog.exemplo.com/post", ownHost })).toBe("outro");
  });

  it("sem origem, origem inválida ou vinda do próprio site é direto", () => {
    expect(classifyVisitSource({ referrer: "", ownHost })).toBe("direto");
    expect(classifyVisitSource({ referrer: null, ownHost })).toBe("direto");
    expect(classifyVisitSource({ referrer: "nao-e-um-endereco", ownHost })).toBe("direto");
    expect(classifyVisitSource({ referrer: "https://aprazzo.com.br/termos", ownHost })).toBe("direto");
  });
});

describe("shouldCountVisitor", () => {
  it("não conta navegador automatizado nem quem pediu para ficar de fora", () => {
    expect(shouldCountVisitor({ automated: false, optedOut: false })).toBe(true);
    expect(shouldCountVisitor({ automated: true, optedOut: false })).toBe(false);
    expect(shouldCountVisitor({ automated: false, optedOut: true })).toBe(false);
  });
});
