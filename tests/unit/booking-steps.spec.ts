import { describe, expect, it } from "vitest";

import { reachableStep, stepFromHistoryState } from "@/lib/booking-steps";

const nothing = { service: false, professional: false, slot: false };

describe("reachableStep", () => {
  it("mostra o passo pedido quando as escolhas sustentam", () => {
    expect(reachableStep(1, nothing)).toBe(1);
    expect(reachableStep(2, { ...nothing, service: true })).toBe(2);
    expect(reachableStep(3, { service: true, professional: true, slot: false })).toBe(3);
    expect(reachableStep(4, { service: true, professional: true, slot: true })).toBe(4);
  });

  it("voltar um passo mantém o que já foi escolhido", () => {
    expect(reachableStep(2, { service: true, professional: true, slot: true })).toBe(2);
    expect(reachableStep(1, { service: true, professional: true, slot: true })).toBe(1);
  });

  it("passo sem o que precisa cai no anterior, nunca numa tela vazia", () => {
    expect(reachableStep(4, { service: true, professional: true, slot: false })).toBe(3);
    expect(reachableStep(3, { service: true, professional: false, slot: false })).toBe(2);
    expect(reachableStep(4, nothing)).toBe(1);
  });
});

describe("stepFromHistoryState", () => {
  it("lê o passo da entrada do histórico", () => {
    expect(stepFromHistoryState({ bookingStep: 3 })).toBe(3);
  });

  it("entrada que não é da reserva (ou inválida) é o passo 1", () => {
    expect(stepFromHistoryState(null)).toBe(1);
    expect(stepFromHistoryState({ outraCoisa: true })).toBe(1);
    expect(stepFromHistoryState({ bookingStep: 9 })).toBe(1);
    expect(stepFromHistoryState({ bookingStep: "2" })).toBe(1);
  });
});
