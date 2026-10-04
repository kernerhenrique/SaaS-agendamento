import { describe, expect, it } from "vitest";

import { AppointmentStatus } from "@/generated/prisma/enums";
import { isStatusChangeAvailable } from "@/server/modules/appointment/status-rules";
import { DEFAULT_TEMPLATES, messageKindsFor, renderTemplate } from "@/server/modules/notification/whatsapp/templates";

const NOW = new Date("2026-10-05T15:00:00Z");
const BEFORE = new Date("2026-10-05T14:30:00Z");
const AFTER = new Date("2026-10-07T12:00:00Z");

describe("isStatusChangeAvailable", () => {
  it("concluir e falta só a partir do início", () => {
    expect(isStatusChangeAvailable(AppointmentStatus.COMPLETED, AFTER, NOW)).toBe(false);
    expect(isStatusChangeAvailable(AppointmentStatus.NO_SHOW, AFTER, NOW)).toBe(false);
    expect(isStatusChangeAvailable(AppointmentStatus.COMPLETED, BEFORE, NOW)).toBe(true);
    expect(isStatusChangeAvailable(AppointmentStatus.NO_SHOW, NOW, NOW)).toBe(true);
  });

  it("cancelar e confirmar valem a qualquer momento", () => {
    expect(isStatusChangeAvailable(AppointmentStatus.CANCELLED, AFTER, NOW)).toBe(true);
    expect(isStatusChangeAvailable(AppointmentStatus.CONFIRMED, AFTER, NOW)).toBe(true);
  });
});

describe("messageKindsFor", () => {
  it("futuro ativo: confirmação, lembrete e remarcação", () => {
    expect(messageKindsFor("CONFIRMED", AFTER, NOW)).toEqual(["CONFIRMATION", "REMINDER", "RESCHEDULE"]);
  });

  it("concluído: só pós-atendimento; cancelado: só aviso de cancelamento", () => {
    expect(messageKindsFor("COMPLETED", BEFORE, NOW)).toEqual(["FOLLOW_UP"]);
    expect(messageKindsFor("CANCELLED", AFTER, NOW)).toEqual(["CANCELLATION"]);
  });

  it("já começou e não foi concluído: nenhum texto pronto (só a conversa)", () => {
    expect(messageKindsFor("CONFIRMED", BEFORE, NOW)).toEqual([]);
    expect(messageKindsFor("NO_SHOW", BEFORE, NOW)).toEqual([]);
  });
});

describe("modelos de aviso", () => {
  const values = {
    cliente: "Ana Souza",
    primeiro_nome: "Ana",
    servico: "Corte",
    profissional: "João",
    data: "segunda-feira, 05/10",
    hora: "14:00",
    negocio: "Barbearia X",
    endereco: "",
    link: "https://exemplo/link",
    link_reserva: "https://exemplo/barbearia-x",
  };

  it("cancelamento leva o link para reservar outro horário", () => {
    const text = renderTemplate(DEFAULT_TEMPLATES.CANCELLATION, values);
    expect(text).toContain("cancelar seu horário em Barbearia X");
    expect(text).toContain("https://exemplo/barbearia-x");
  });

  it("remarcação traz o novo horário e some a linha de endereço vazia", () => {
    const text = renderTemplate(DEFAULT_TEMPLATES.RESCHEDULE, values);
    expect(text).toContain("segunda-feira, 05/10 às 14:00");
    expect(text).not.toContain("Endereço");
    expect(text).toContain("https://exemplo/link");
  });
});
