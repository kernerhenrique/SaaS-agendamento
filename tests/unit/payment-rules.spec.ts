import { describe, expect, it } from "vitest";

import {
  agendaPaymentStatus,
  commissionFor,
  summarizePayments,
  validateCommissionPercent,
  validatePaymentInput,
  validatePriceCents,
} from "@/server/modules/payment/payment-rules";

describe("summarizePayments", () => {
  it("sem pagamento: pendente com o valor inteiro em aberto", () => {
    expect(summarizePayments(5000, [])).toEqual({
      priceCents: 5000,
      paidCents: 0,
      discountCents: 0,
      balanceCents: 5000,
      status: "PENDING",
    });
  });

  it("pago à vista", () => {
    expect(summarizePayments(5000, [{ amountCents: 5000, discountCents: 0 }]).status).toBe("PAID");
  });

  it("desconto reduz o que falta: R$ 45 + R$ 5 de desconto quita R$ 50", () => {
    const summary = summarizePayments(5000, [{ amountCents: 4500, discountCents: 500 }]);
    expect(summary).toMatchObject({ paidCents: 4500, discountCents: 500, balanceCents: 0, status: "PAID" });
  });

  it("sinal deixa parcial; o saldo depois quita", () => {
    const sinal = { amountCents: 3000, discountCents: 0 };
    expect(summarizePayments(7500, [sinal])).toMatchObject({ balanceCents: 4500, status: "PARTIAL" });
    expect(summarizePayments(7500, [sinal, { amountCents: 4500, discountCents: 0 }]).status).toBe("PAID");
  });

  it("valor ajustado para cima (serviço 'a partir de') volta a deixar saldo", () => {
    expect(summarizePayments(12000, [{ amountCents: 8000, discountCents: 0 }])).toMatchObject({
      balanceCents: 4000,
      status: "PARTIAL",
    });
  });

  it("pagar a mais não gera saldo negativo", () => {
    expect(summarizePayments(5000, [{ amountCents: 6000, discountCents: 0 }])).toMatchObject({
      balanceCents: 0,
      status: "PAID",
    });
  });

  it("desconto total (cortesia) conta como pago", () => {
    expect(summarizePayments(5000, [{ amountCents: 0, discountCents: 5000 }]).status).toBe("PAID");
  });

  it("atendimento de valor zero já nasce quitado", () => {
    expect(summarizePayments(0, []).status).toBe("PAID");
  });
});

describe("commissionFor", () => {
  it("aplica a % congelada sobre o recebido, arredondando ao centavo", () => {
    expect(commissionFor({ amountCents: 5000, commissionPercent: 40 })).toBe(2000);
    expect(commissionFor({ amountCents: 3333, commissionPercent: 50 })).toBe(1667);
  });

  it("sem % (null ou 0) não há comissão", () => {
    expect(commissionFor({ amountCents: 5000, commissionPercent: null })).toBe(0);
    expect(commissionFor({ amountCents: 5000, commissionPercent: 0 })).toBe(0);
  });
});

describe("validações", () => {
  const endOfToday = new Date("2026-09-28T03:00:00Z"); // fim de 27/09 em São Paulo
  const today = new Date("2026-09-27T15:00:00Z");

  it("aceita recebimento de hoje ou passado", () => {
    expect(validatePaymentInput({ amountCents: 5000, discountCents: 0, receivedAt: today }, endOfToday)).toBeNull();
  });

  it("recusa data futura, valores negativos, fração de centavo e registro vazio", () => {
    const future = new Date("2026-09-28T12:00:00Z");
    expect(validatePaymentInput({ amountCents: 5000, discountCents: 0, receivedAt: future }, endOfToday)).toMatch(
      /futuro/,
    );
    expect(validatePaymentInput({ amountCents: -1, discountCents: 0, receivedAt: today }, endOfToday)).not.toBeNull();
    expect(validatePaymentInput({ amountCents: 10.5, discountCents: 0, receivedAt: today }, endOfToday)).not.toBeNull();
    expect(validatePaymentInput({ amountCents: 0, discountCents: 0, receivedAt: today }, endOfToday)).toMatch(
      /Informe/,
    );
  });

  it("valor do atendimento e % de comissão", () => {
    expect(validatePriceCents(7500)).toBeNull();
    expect(validatePriceCents(-1)).not.toBeNull();
    expect(validateCommissionPercent(null)).toBeNull();
    expect(validateCommissionPercent(40)).toBeNull();
    expect(validateCommissionPercent(101)).not.toBeNull();
    expect(validateCommissionPercent(12.5)).not.toBeNull();
  });
});

describe("agendaPaymentStatus (selo no cartão da agenda)", () => {
  const sinal = [{ amountCents: 2000, discountCents: 0 }];
  it("concluído mostra sempre: a receber, parcial ou pago", () => {
    expect(agendaPaymentStatus("COMPLETED", 5000, [])).toBe("PENDING");
    expect(agendaPaymentStatus("COMPLETED", 5000, sinal)).toBe("PARTIAL");
    expect(agendaPaymentStatus("COMPLETED", 5000, [{ amountCents: 5000, discountCents: 0 }])).toBe("PAID");
  });
  it("ainda por vir: só quando já entrou algum valor (sinal = parcial, adiantado = pago)", () => {
    expect(agendaPaymentStatus("CONFIRMED", 5000, [])).toBeNull();
    expect(agendaPaymentStatus("CONFIRMED", 0, [])).toBeNull();
    expect(agendaPaymentStatus("CONFIRMED", 5000, sinal)).toBe("PARTIAL");
    expect(agendaPaymentStatus("PENDING", 5000, [{ amountCents: 5000, discountCents: 0 }])).toBe("PAID");
  });
  it("cancelado e falta: nada", () => {
    expect(agendaPaymentStatus("CANCELLED", 5000, sinal)).toBeNull();
    expect(agendaPaymentStatus("NO_SHOW", 5000, sinal)).toBeNull();
  });
});
