import { describe, expect, it } from "vitest";

import { Weekday } from "@/generated/prisma/enums";
import { utcToLocalDate, utcToLocalMinutes, weekdayOfLocalDate } from "@/lib/date";
import { isCronAuthorized } from "@/server/modules/demo/cron-auth";
import { buildDemoClients, buildDemoSchedule, DEMO_FUTURE_DAYS, DEMO_PAST_DAYS, seededRandom } from "@/server/modules/demo/demo-data";

const TZ = "America/Sao_Paulo";
const NOW = new Date("2026-10-07T15:20:00-03:00"); // quarta-feira, 15:20

const weekdays = [Weekday.MONDAY, Weekday.TUESDAY, Weekday.WEDNESDAY, Weekday.THURSDAY, Weekday.FRIDAY];
const professionals = [
  {
    id: "carlos",
    commissionPercent: 50,
    workingHours: weekdays.map((weekday) => ({ weekday, startMinute: 540, endMinute: 1140, breakStartMinute: 720, breakEndMinute: 780 })),
    serviceIds: ["corte", "barba", "combo"],
  },
  {
    id: "lucas",
    commissionPercent: null,
    workingHours: [{ weekday: Weekday.SATURDAY, startMinute: 480, endMinute: 840, breakStartMinute: null, breakEndMinute: null }],
    serviceIds: ["corte"],
  },
];
const services = [
  { id: "corte", durationMin: 30, priceCents: 4500 },
  { id: "barba", durationMin: 30, priceCents: 3500 },
  { id: "combo", durationMin: 60, priceCents: 7000 },
];
const schedule = buildDemoSchedule({ now: NOW, timezone: TZ, professionals, services, clientCount: 40, seed: "demo:2026-10-07" });

describe("buildDemoSchedule", () => {
  it("é determinístico pela semente", () => {
    const again = buildDemoSchedule({ now: NOW, timezone: TZ, professionals, services, clientCount: 40, seed: "demo:2026-10-07" });
    expect(again).toEqual(schedule);
    const otherDay = buildDemoSchedule({ now: NOW, timezone: TZ, professionals, services, clientCount: 40, seed: "demo:2026-10-08" });
    expect(otherDay).not.toEqual(schedule);
  });

  it("cobre o histórico e os próximos dias, sem passar disso", () => {
    const dates = schedule.map((a) => utcToLocalDate(a.startAt, TZ)).sort();
    expect(dates[0] >= "2026-08-08").toBe(true); // hoje − 60
    expect(dates.at(-1)! <= "2026-10-14").toBe(true); // hoje + 7
    expect(DEMO_PAST_DAYS).toBe(60);
    expect(DEMO_FUTURE_DAYS).toBe(7);
  });

  it("nunca sobrepõe horários do mesmo profissional (fora os cancelados, como a constraint do banco)", () => {
    for (const pro of professionals) {
      const active = schedule
        .filter((a) => a.professionalId === pro.id && a.status !== "CANCELLED")
        .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
      for (let i = 1; i < active.length; i++) {
        expect(active[i].startAt.getTime()).toBeGreaterThanOrEqual(active[i - 1].endAt.getTime());
      }
    }
  });

  it("respeita o expediente, o intervalo e os serviços de cada profissional", () => {
    for (const appointment of schedule) {
      const pro = professionals.find((p) => p.id === appointment.professionalId)!;
      const day = pro.workingHours.find((h) => h.weekday === weekdayOfLocalDate(utcToLocalDate(appointment.startAt, TZ)));
      expect(day, "só em dia de expediente").toBeDefined();
      const start = utcToLocalMinutes(appointment.startAt, TZ);
      const end = utcToLocalMinutes(appointment.endAt, TZ);
      expect(start).toBeGreaterThanOrEqual(day!.startMinute);
      expect(end).toBeLessThanOrEqual(day!.endMinute);
      if (day!.breakStartMinute !== null) {
        expect(end <= day!.breakStartMinute! || start >= day!.breakEndMinute!).toBe(true);
      }
      expect(pro.serviceIds).toContain(appointment.serviceId);
    }
  });

  it("passado tem estado final e pagamentos coerentes; futuro fica marcado", () => {
    const past = schedule.filter((a) => a.endAt <= NOW);
    const future = schedule.filter((a) => a.endAt > NOW);
    expect(past.every((a) => ["COMPLETED", "NO_SHOW", "CANCELLED"].includes(a.status))).toBe(true);
    expect(future.every((a) => ["PENDING", "CONFIRMED", "CANCELLED"].includes(a.status))).toBe(true);
    expect(schedule.filter((a) => a.status !== "COMPLETED").every((a) => a.payments.length === 0)).toBe(true);

    const completed = past.filter((a) => a.status === "COMPLETED");
    for (const a of completed) {
      for (const p of a.payments) {
        expect(p.amountCents + p.discountCents).toBeLessThanOrEqual(a.priceCents);
        expect(p.receivedAt).toEqual(a.endAt);
        expect(p.commissionPercent).toBe(professionals.find((pro) => pro.id === a.professionalId)!.commissionPercent);
      }
    }
    // Há de tudo para o Início e o Financeiro mostrarem: pagos, a receber, faltas.
    expect(completed.some((a) => a.payments.length === 0)).toBe(true);
    expect(past.some((a) => a.status === "NO_SHOW")).toBe(true);
  });

  it("deixa horários livres amanhã para o visitante reservar", () => {
    const tomorrow = schedule.filter((a) => utcToLocalDate(a.startAt, TZ) === "2026-10-08" && a.professionalId === "carlos");
    const bookedMinutes = tomorrow.reduce((sum, a) => sum + (a.endAt.getTime() - a.startAt.getTime()) / 60000, 0);
    expect(bookedMinutes).toBeLessThan(9 * 60); // expediente de 9 h (10 h menos 1 h de intervalo)
  });
});

describe("dados fictícios", () => {
  it("clientes com telefones únicos na faixa não atribuída e e-mails em example.com", () => {
    const clients = buildDemoClients(40);
    expect(new Set(clients.map((c) => c.phone)).size).toBe(40);
    expect(clients.every((c) => /^119000000\d{2}$/.test(c.phone))).toBe(true);
    expect(clients.filter((c) => c.email).every((c) => c.email!.endsWith("@example.com"))).toBe(true);
  });

  it("gerador pseudoaleatório fica entre 0 e 1", () => {
    const random = seededRandom("x");
    for (let i = 0; i < 1000; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("autorização do cron", () => {
  it("só aceita o Bearer com o segredo configurado", () => {
    expect(isCronAuthorized("Bearer segredo-123", "segredo-123")).toBe(true);
    expect(isCronAuthorized("Bearer outro", "segredo-123")).toBe(false);
    expect(isCronAuthorized(null, "segredo-123")).toBe(false);
    expect(isCronAuthorized("Bearer ", undefined)).toBe(false);
    expect(isCronAuthorized("Bearer undefined", undefined)).toBe(false);
  });
});
