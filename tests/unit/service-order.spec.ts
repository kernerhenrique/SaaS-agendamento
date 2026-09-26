import { describe, expect, it } from "vitest";

import { moveWithinCategory } from "@/server/modules/service/service-order";

const services = [
  { id: "corte", categoryId: "cabelo" },
  { id: "barba", categoryId: "barba" },
  { id: "pigmento", categoryId: "cabelo" },
  { id: "luzes", categoryId: "cabelo" },
  { id: "avulso", categoryId: null },
];

describe("moveWithinCategory", () => {
  it("sobe trocando com o vizinho da mesma categoria, pulando outras", () => {
    expect(moveWithinCategory(services, "pigmento", "up")).toEqual(["pigmento", "barba", "corte", "luzes", "avulso"]);
  });

  it("desce trocando com o próximo da mesma categoria", () => {
    expect(moveWithinCategory(services, "pigmento", "down")).toEqual(["corte", "barba", "luzes", "pigmento", "avulso"]);
  });

  it("primeiro do grupo não sobe e último não desce", () => {
    const original = services.map((s) => s.id);
    expect(moveWithinCategory(services, "corte", "up")).toEqual(original);
    expect(moveWithinCategory(services, "luzes", "down")).toEqual(original);
    expect(moveWithinCategory(services, "avulso", "up")).toEqual(original);
  });

  it("id desconhecido não muda nada", () => {
    expect(moveWithinCategory(services, "x", "up")).toEqual(services.map((s) => s.id));
  });
});
