import { describe, expect, it } from "vitest";

import {
  chooseLabel,
  emptyLabel,
  getVertical,
  mostRequestedLabel,
  newLabel,
  ofLabel,
  othersLabel,
  selectLabel,
  type Term,
} from "@/config/vertical";

const feminine: Term = { singular: "Especialista", plural: "Especialistas", gender: "f" };

describe("getVertical", () => {
  it("resolve o preset pela chave", () => {
    expect(getVertical("barbershop").terms.professional.singular).toBe("Barbeiro");
    expect(getVertical("beauty_clinic").terms.service.singular).toBe("Procedimento");
  });

  it("cai no genérico com chave desconhecida, nula ou vazia", () => {
    expect(getVertical("pet_shop").key).toBe("generic");
    expect(getVertical(null).key).toBe("generic");
    expect(getVertical("").terms.professional.singular).toBe("Profissional");
  });

  it("não aceita chaves herdadas do protótipo como preset", () => {
    expect(getVertical("toString").key).toBe("generic");
  });
});

describe("textos com concordância", () => {
  const barber = getVertical("barbershop").terms.professional;

  it("masculino", () => {
    expect(newLabel(barber)).toBe("Novo barbeiro");
    expect(emptyLabel(barber)).toBe("Nenhum barbeiro cadastrado ainda.");
    expect(selectLabel(barber)).toBe("Selecione um barbeiro");
    expect(chooseLabel(barber)).toBe("Escolha o barbeiro");
    expect(mostRequestedLabel(barber)).toBe("Barbeiro mais requisitado");
    expect(ofLabel(getVertical("barbershop").terms.client)).toBe("do cliente");
    expect(othersLabel(getVertical("barbershop").terms.service)).toBe("Outros serviços");
  });

  it("feminino", () => {
    expect(newLabel(feminine)).toBe("Nova especialista");
    expect(emptyLabel(feminine)).toBe("Nenhuma especialista cadastrada ainda.");
    expect(selectLabel(feminine)).toBe("Selecione uma especialista");
    expect(chooseLabel(feminine)).toBe("Escolha a especialista");
    expect(ofLabel(feminine)).toBe("da especialista");
    expect(mostRequestedLabel(feminine)).toBe("Especialista mais requisitada");
    expect(othersLabel(feminine)).toBe("Outras especialistas");
  });
});
