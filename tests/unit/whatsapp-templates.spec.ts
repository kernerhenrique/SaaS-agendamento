import { describe, expect, it } from "vitest";

import { localMinutesToUtc } from "@/lib/date";
import {
  DEFAULT_TEMPLATES,
  buildTemplateValues,
  renderTemplate,
  unknownVariables,
  type TemplateValues,
} from "@/server/modules/notification/whatsapp/templates";

const values: TemplateValues = buildTemplateValues({
  clientName: "  Maria Clara Souza ",
  serviceName: "Corte de cabelo",
  professionalName: "João",
  businessName: "Navalha de Ouro",
  businessAddress: "Rua das Tesouras, 123",
  startAt: localMinutesToUtc("2026-09-30", 17 * 60 + 30, "America/Sao_Paulo"),
  timeZone: "America/Sao_Paulo",
  manageUrl: "https://exemplo.com/agendamento/abc/gerenciar",
});

describe("buildTemplateValues", () => {
  it("formata nome, data e hora no fuso do negócio", () => {
    expect(values.cliente).toBe("Maria Clara Souza");
    expect(values.primeiro_nome).toBe("Maria");
    expect(values.data).toBe("quarta-feira, 30/09");
    expect(values.hora).toBe("17:30");
  });
});

describe("renderTemplate", () => {
  it("preenche as variáveis do modelo padrão de lembrete", () => {
    expect(renderTemplate(DEFAULT_TEMPLATES.REMINDER, values)).toBe(
      [
        "Oi, Maria! Passando para lembrar do seu horário em Navalha de Ouro:",
        "Corte de cabelo com João",
        "quarta-feira, 30/09 às 17:30",
        "Endereço: Rua das Tesouras, 123",
        "",
        "Se precisar remarcar: https://exemplo.com/agendamento/abc/gerenciar",
      ].join("\n"),
    );
  });

  it("remove a linha inteira quando a variável está vazia (negócio sem endereço)", () => {
    const text = renderTemplate("Oi, {primeiro_nome}!\nEndereço: {endereco}\n\n\nAté logo", { ...values, endereco: "" });
    expect(text).toBe("Oi, Maria!\n\nAté logo");
  });

  it("mantém variável desconhecida para o dono ver o erro de digitação", () => {
    expect(renderTemplate("Oi, {nome}!", values)).toBe("Oi, {nome}!");
    expect(unknownVariables("Oi, {nome} e {primeiro_nome} {nome}")).toEqual(["nome"]);
  });
});
