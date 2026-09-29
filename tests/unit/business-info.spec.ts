import { describe, expect, it } from "vitest";

import { describeBookingPolicies, formatMinutesDuration, groupBusinessHours } from "@/lib/business-info";

describe("groupBusinessHours", () => {
  const nineToSix = { startMinute: 540, endMinute: 1080 };

  it("agrupa dias seguidos com o mesmo horário e marca os fechados", () => {
    expect(
      groupBusinessHours([
        { weekday: "MONDAY", ...nineToSix },
        { weekday: "TUESDAY", ...nineToSix },
        { weekday: "WEDNESDAY", ...nineToSix },
        { weekday: "THURSDAY", ...nineToSix },
        { weekday: "FRIDAY", ...nineToSix },
        { weekday: "SATURDAY", startMinute: 480, endMinute: 840 },
      ]),
    ).toEqual([
      { days: "Seg a Sex", hours: "09:00 às 18:00" },
      { days: "Sábado", hours: "08:00 às 14:00" },
      { days: "Domingo", hours: "Fechado" },
    ]);
  });

  it("usa 'e' para dois dias e não junta dias separados por um fechado", () => {
    expect(
      groupBusinessHours([
        { weekday: "SATURDAY", ...nineToSix },
        { weekday: "SUNDAY", ...nineToSix },
        { weekday: "TUESDAY", ...nineToSix },
      ]),
    ).toEqual([
      { days: "Segunda", hours: "Fechado" },
      { days: "Terça", hours: "09:00 às 18:00" },
      { days: "Qua a Sex", hours: "Fechado" },
      { days: "Sáb e Dom", hours: "09:00 às 18:00" },
    ]);
  });
});

describe("formatMinutesDuration", () => {
  it("formata minutos, horas e dias", () => {
    expect(formatMinutesDuration(30)).toBe("30 min");
    expect(formatMinutesDuration(120)).toBe("2 h");
    expect(formatMinutesDuration(90)).toBe("1 h 30 min");
    expect(formatMinutesDuration(1440)).toBe("1 dia");
    expect(formatMinutesDuration(3 * 1440)).toBe("3 dias");
    expect(formatMinutesDuration(36 * 60)).toBe("36 h");
  });
});

describe("describeBookingPolicies", () => {
  it("sem antecedência nem prazo: só a janela e o cancelamento até o horário", () => {
    expect(describeBookingPolicies({ minBookingNoticeMinutes: 0, maxBookingWindowDays: 60, cancellationDeadlineHours: 0 })).toEqual([
      "Agenda aberta para os próximos 60 dias",
      "Cancelamento ou troca pelo link até o horário marcado",
    ]);
  });

  it("com antecedência e prazo", () => {
    expect(describeBookingPolicies({ minBookingNoticeMinutes: 120, maxBookingWindowDays: 30, cancellationDeadlineHours: 24 })).toEqual([
      "Reservas com pelo menos 2 h de antecedência",
      "Agenda aberta para os próximos 30 dias",
      "Cancelamento ou troca pelo link até 1 dia antes do horário",
    ]);
  });
});
