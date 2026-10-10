import { describe, expect, it } from "vitest";

import {
  applyClientFilter,
  isInactive,
  matchesClientSearch,
  normalizeTags,
  parseClientFilter,
  summarizeClient,
} from "@/server/modules/client/client-rules";

const NOW = new Date("2026-09-26T12:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
const daysAhead = (days: number) => new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);

describe("summarizeClient", () => {
  it("conta concluídos e faltas, pega a última visita e o próximo agendamento", () => {
    const summary = summarizeClient(
      [
        { status: "COMPLETED", startAt: daysAgo(40) },
        { status: "COMPLETED", startAt: daysAgo(10) },
        { status: "NO_SHOW", startAt: daysAgo(5) },
        { status: "CANCELLED", startAt: daysAgo(3) },
        { status: "CONFIRMED", startAt: daysAhead(7) },
        { status: "PENDING", startAt: daysAhead(2) },
        // Aberto mas no passado (atrasado): não é "próximo".
        { status: "CONFIRMED", startAt: daysAgo(1) },
      ],
      NOW,
    );
    expect(summary).toEqual({ completed: 2, noShows: 1, lastVisitAt: daysAgo(10), nextAppointmentAt: daysAhead(2) });
  });

  it("cliente sem histórico", () => {
    expect(summarizeClient([], NOW)).toEqual({ completed: 0, noShows: 0, lastVisitAt: null, nextAppointmentAt: null });
  });
});

describe("isInactive", () => {
  const base = { completed: 1, noShows: 0, nextAppointmentAt: null };

  it("última visita mais antiga que N dias e nada marcado", () => {
    expect(isInactive({ ...base, lastVisitAt: daysAgo(61) }, 60, NOW)).toBe(true);
    expect(isInactive({ ...base, lastVisitAt: daysAgo(59) }, 60, NOW)).toBe(false);
  });

  it("quem já tem horário marcado não está sumido", () => {
    expect(isInactive({ ...base, lastVisitAt: daysAgo(90), nextAppointmentAt: daysAhead(1) }, 60, NOW)).toBe(false);
  });

  it("quem nunca foi atendido não conta como sumido", () => {
    expect(isInactive({ ...base, completed: 0, lastVisitAt: null }, 30, NOW)).toBe(false);
  });
});

describe("applyClientFilter", () => {
  const row = (id: string, completed: number, noShows: number, lastVisitDays: number | null) => ({
    id,
    summary: {
      completed,
      noShows,
      lastVisitAt: lastVisitDays == null ? null : daysAgo(lastVisitDays),
      nextAppointmentAt: null,
    },
  });
  const rows = [row("a", 5, 0, 100), row("b", 1, 3, 35), row("c", 2, 1, 5), row("d", 0, 0, null)];

  it("sumidos: filtra pelo prazo e mostra quem sumiu há mais tempo primeiro", () => {
    expect(applyClientFilter(rows, "sumidos-30", NOW).map((r) => r.id)).toEqual(["a", "b"]);
    expect(applyClientFilter(rows, "sumidos-90", NOW).map((r) => r.id)).toEqual(["a"]);
  });

  it("mais faltas e mais atendimentos ordenam do maior para o menor", () => {
    expect(applyClientFilter(rows, "mais-faltas", NOW).map((r) => r.id)).toEqual(["b", "c"]);
    expect(applyClientFilter(rows, "mais-atendimentos", NOW).map((r) => r.id)).toEqual(["a", "c", "b"]);
  });

  it("todos mantém a ordem recebida", () => {
    expect(applyClientFilter(rows, "todos", NOW).map((r) => r.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("filtro desconhecido na URL cai em todos", () => {
    expect(parseClientFilter("qualquer")).toBe("todos");
    expect(parseClientFilter("sumidos-60")).toBe("sumidos-60");
  });
});

describe("matchesClientSearch", () => {
  const client = { name: "José Antônio", phone: "11987654321" };

  it("nome sem acento e sem caixa", () => {
    expect(matchesClientSearch(client, "jose anto")).toBe(true);
  });

  it("parte do telefone, com ou sem máscara", () => {
    expect(matchesClientSearch(client, "98765")).toBe(true);
    expect(matchesClientSearch(client, "(11) 98765")).toBe(true);
  });

  it("não confunde poucos dígitos com telefone", () => {
    expect(matchesClientSearch(client, "11")).toBe(false);
  });
});

describe("normalizeTags", () => {
  it("apara, remove repetidas ignorando caixa e vazias", () => {
    expect(normalizeTags(["  VIP ", "vip", "", "Prefere  manhã"])).toEqual(["VIP", "Prefere manhã"]);
  });

  it("limita quantidade e tamanho", () => {
    const many = Array.from({ length: 15 }, (_, i) => `tag${i}`);
    expect(normalizeTags(many)).toHaveLength(10);
    expect(normalizeTags(["x".repeat(50)])[0]).toHaveLength(30);
  });
});

describe("bookedAsNote (reserva pela página com telefone já cadastrado)", () => {
  it("mesmo nome (maiúsculas, acentos e espaços não contam): sem observação", async () => {
    const { bookedAsNote } = await import("@/server/modules/client/client-rules");
    expect(bookedAsNote("Maria José", "  maria   jose ")).toBeNull();
  });
  it("outro nome: vira a observação, com o nome como foi digitado", async () => {
    const { bookedAsNote } = await import("@/server/modules/client/client-rules");
    expect(bookedAsNote("Maria José", " Pedrinho  Silva ")).toBe("Reservado como: Pedrinho Silva");
  });
});
