import { describe, expect, it } from "vitest";

import { canRemovePayment, checkPaymentFits, summarizePayments } from "@/server/modules/payment/payment-rules";

/** Os casos que confundiam: cada registro é só o que entrou naquele momento. */
describe("pagamento cabe no que falta", () => {
  const after = (price: number, payments: { amountCents: number; discountCents: number }[]) => summarizePayments(price, payments);

  it("caso 1: R$ 35 e depois o TOTAL (R$ 40) num serviço de R$ 50 é recusado; os R$ 5 que faltam passam", () => {
    const current = after(5000, [{ amountCents: 3500, discountCents: 0 }]);
    expect(checkPaymentFits(current, { amountCents: 4000, discountCents: 0 })).toMatch(/Faltam só R\$ 15,00.*não o total/);
    expect(checkPaymentFits(current, { amountCents: 500, discountCents: 0 })).toBeNull();
    expect(after(5000, [{ amountCents: 3500, discountCents: 0 }, { amountCents: 500, discountCents: 0 }])).toMatchObject({
      paidCents: 4000,
      balanceCents: 1000,
      status: "PARTIAL",
    });
  });

  it("caso 2: só desconto, com o recebido em zero, funciona; desconto + o valor todo é recusado", () => {
    const current = after(5000, []);
    expect(checkPaymentFits(current, { amountCents: 0, discountCents: 1000 })).toBeNull();
    expect(checkPaymentFits(current, { amountCents: 5000, discountCents: 1000 })).toMatch(/Faltam só R\$ 50,00/);
  });

  it("caso 3: depois de quitado, nem desconto nem recebimento entram", () => {
    const paid = after(5000, [{ amountCents: 5000, discountCents: 0 }]);
    expect(checkPaymentFits(paid, { amountCents: 0, discountCents: 500 })).toMatch(/já está quitado/);
  });

  it("caso 4: não dá para baixar o valor do atendimento abaixo do já recebido; subir para cobrar a mais pode", () => {
    const paid = after(5000, [{ amountCents: 5000, discountCents: 0 }]);
    expect(checkPaymentFits(paid, { amountCents: 0, discountCents: 0, priceCents: 4000 })).toMatch(/não pode ficar menor/);
    expect(checkPaymentFits(paid, { amountCents: 1000, discountCents: 0, priceCents: 6000 })).toBeNull();
  });

  it("três registros no mesmo atendimento: sinal, desconto e o resto fecham exatamente", () => {
    let payments = [{ amountCents: 2000, discountCents: 0 }];
    expect(checkPaymentFits(after(7500, payments), { amountCents: 0, discountCents: 500 })).toBeNull();
    payments = [...payments, { amountCents: 0, discountCents: 500 }];
    expect(checkPaymentFits(after(7500, payments), { amountCents: 5000, discountCents: 0 })).toBeNull();
    payments = [...payments, { amountCents: 5000, discountCents: 0 }];
    expect(after(7500, payments)).toMatchObject({ balanceCents: 0, status: "PAID" });
    expect(checkPaymentFits(after(7500, payments), { amountCents: 1, discountCents: 0 })).toMatch(/já está quitado/);
  });
});

describe("quem pode remover um recebimento", () => {
  const today = "2026-10-06";
  it("dono remove qualquer um; quem lançou, só o próprio e no mesmo dia", () => {
    expect(canRemovePayment({ isOwner: true, userId: "dono" }, { createdByUserId: "joao", createdDay: "2026-09-01" }, today)).toBe(true);
    expect(canRemovePayment({ isOwner: false, userId: "joao" }, { createdByUserId: "joao", createdDay: today }, today)).toBe(true);
    expect(canRemovePayment({ isOwner: false, userId: "joao" }, { createdByUserId: "joao", createdDay: "2026-10-05" }, today)).toBe(false);
    expect(canRemovePayment({ isOwner: false, userId: "joao" }, { createdByUserId: "dono", createdDay: today }, today)).toBe(false);
    expect(canRemovePayment({ isOwner: false, userId: "joao" }, { createdByUserId: null, createdDay: today }, today)).toBe(false);
  });
});
