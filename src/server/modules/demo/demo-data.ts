import type { AppointmentStatus, PaymentMethod, Weekday } from "@/generated/prisma/enums";
import { addDaysToIsoDate, localMinutesToUtc, utcToLocalDate, weekdayOfLocalDate } from "@/lib/date";

/**
 * Dados de exemplo da demonstração, sempre relativos a "hoje": histórico dos
 * últimos dias (concluídos, pagos, faltas, cancelados, a receber) e agenda dos
 * próximos dias com horários livres para o visitante reservar. Puro e
 * determinístico: a mesma semente (negócio + dia) gera os mesmos dados.
 */

export interface DemoProfessional {
  id: string;
  commissionPercent: number | null;
  workingHours: { weekday: Weekday; startMinute: number; endMinute: number; breakStartMinute: number | null; breakEndMinute: number | null }[];
  serviceIds: string[];
}

export interface DemoService {
  id: string;
  durationMin: number;
  priceCents: number;
}

export interface DemoPayment {
  amountCents: number;
  discountCents: number;
  method: PaymentMethod;
  receivedAt: Date;
  commissionPercent: number | null;
}

export interface DemoAppointment {
  professionalId: string;
  serviceId: string;
  clientIndex: number;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
  priceCents: number;
  payments: DemoPayment[];
  /** Quando foi marcado: dias antes; umas poucas reservas nas últimas horas (o aviso "reservas novas" do Início). */
  createdAt: Date;
}

export interface DemoClient {
  name: string;
  phone: string;
  email: string | null;
  tags: string[];
  internalNotes: string | null;
}

export const DEMO_PAST_DAYS = 60;
export const DEMO_FUTURE_DAYS = 7;
const SLOT_STEP = 15;

const FIRST_NAMES = [
  "Ana", "Bruno", "Carla", "Diego", "Eduarda", "Felipe", "Gabriela", "Henrique", "Isabela", "João Pedro",
  "Juliana", "Lucas", "Mariana", "Matheus", "Natália", "Otávio", "Paula", "Rafael", "Renata", "Rodrigo",
  "Sabrina", "Thiago", "Vanessa", "Vinícius", "Beatriz", "Caio", "Débora", "Fábio", "Larissa", "Marcelo",
  "Priscila", "Ricardo", "Tatiane", "Gustavo", "Camila", "André", "Letícia", "Leonardo", "Aline", "Pedro",
];
const LAST_NAMES = ["Silva", "Souza", "Oliveira", "Santos", "Lima", "Pereira", "Costa", "Almeida", "Ribeiro", "Carvalho", "Gomes", "Martins"];

/** Gerador pseudoaleatório pequeno (mulberry32) com semente em texto. */
export function seededRandom(seed: string): () => number {
  let state = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    state = Math.imul(state ^ seed.charCodeAt(i), 3432918353);
    state = (state << 13) | (state >>> 19);
  }
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(random: () => number, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

/**
 * Clientes fictícios. Telefones na faixa 11 90000-00xx (não atribuída a
 * celulares reais) e e-mails em example.com: nada chega a uma pessoa de verdade.
 */
export function buildDemoClients(count: number): DemoClient[] {
  return Array.from({ length: count }, (_, i) => {
    const name = `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 7) % LAST_NAMES.length]}`;
    const slug = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]+/g, ".");
    return {
      name,
      phone: `119000000${String(i + 1).padStart(2, "0")}`,
      email: i % 3 === 0 ? `${slug}@example.com` : null,
      tags: i < 6 ? ["Fiel"] : i % 11 === 4 ? ["Prefere manhã"] : [],
      internalNotes: i === 0 ? "Gosta de chegar 10 minutos antes. Prefere pagar no PIX." : null,
    };
  });
}

/** Proporção da agenda ocupada: cheia no passado, esvaziando nos próximos dias. */
function fillRate(dayOffset: number): number {
  if (dayOffset < 0) return 0.72;
  return Math.max(0.15, 0.6 - dayOffset * 0.07);
}

function pastStatus(random: () => number): AppointmentStatus {
  const roll = random();
  if (roll < 0.85) return "COMPLETED";
  if (roll < 0.91) return "NO_SHOW";
  return "CANCELLED";
}

const HOUR = 60 * 60 * 1000;

function bookedAt(startAt: Date, now: Date, isPast: boolean, random: () => number): Date {
  if (!isPast && random() < 0.05) return new Date(now.getTime() - (1 + random() * 18) * HOUR);
  const daysBefore = 1 + Math.floor(random() * 6);
  return new Date(Math.min(startAt.getTime() - daysBefore * 24 * HOUR, now.getTime() - 26 * HOUR));
}

/** Dias em que um atendimento concluído ainda pode estar sem pagamento (um negócio organizado acerta logo). */
const RECENT_UNPAID_DAYS = 10;

function paymentsFor(
  appointment: { priceCents: number; endAt: Date },
  commissionPercent: number | null,
  random: () => number,
  ageDays: number,
): DemoPayment[] {
  const roll = random();
  const recent = ageDays <= RECENT_UNPAID_DAYS;
  if (recent && roll >= 0.93) return []; // a receber (sem pagamento registrado)
  const method = pick<PaymentMethod>(random, ["PIX", "PIX", "PIX", "CREDIT_CARD", "DEBIT_CARD", "CASH"]);
  const discountCents = random() < 0.06 ? Math.round(appointment.priceCents * 0.1) : 0;
  const due = appointment.priceCents - discountCents;
  const amountCents = recent && roll >= 0.88 ? Math.round(due / 2) : due; // parcial só nos recentes
  return [{ amountCents, discountCents, method, receivedAt: appointment.endAt, commissionPercent }];
}

export function buildDemoSchedule(input: {
  now: Date;
  timezone: string;
  professionals: DemoProfessional[];
  services: DemoService[];
  clientCount: number;
  seed: string;
}): DemoAppointment[] {
  const { now, timezone, professionals, services, clientCount } = input;
  const random = seededRandom(input.seed);
  const servicesById = new Map(services.map((service) => [service.id, service]));
  const today = utcToLocalDate(now, timezone);
  const appointments: DemoAppointment[] = [];

  for (let offset = -DEMO_PAST_DAYS; offset <= DEMO_FUTURE_DAYS; offset++) {
    const date = addDaysToIsoDate(today, offset);
    const weekday = weekdayOfLocalDate(date);
    for (const professional of professionals) {
      const day = professional.workingHours.find((hours) => hours.weekday === weekday);
      const offered = professional.serviceIds.flatMap((id) => servicesById.get(id) ?? []);
      if (!day || offered.length === 0) continue;

      let cursor = day.startMinute;
      while (cursor < day.endMinute) {
        if (day.breakStartMinute !== null && day.breakEndMinute !== null && cursor >= day.breakStartMinute && cursor < day.breakEndMinute) {
          cursor = day.breakEndMinute;
          continue;
        }
        // O atendimento precisa caber antes do intervalo (se começar antes dele) e do fim do expediente.
        const limit =
          day.breakStartMinute !== null && cursor < day.breakStartMinute ? day.breakStartMinute : day.endMinute;
        const fitting = offered.filter((service) => cursor + service.durationMin <= limit);
        if (fitting.length === 0 || random() >= fillRate(offset)) {
          cursor += 30;
          continue;
        }
        const service = pick(random, fitting);
        const startAt = localMinutesToUtc(date, cursor, timezone);
        const endAt = localMinutesToUtc(date, cursor + service.durationMin, timezone);
        // A clientela cresce ao longo do histórico (sempre há "clientes novos" no período) e os
        // "fiéis" (índices baixos) aparecem mais; de vez em quando vem o cliente mais recente.
        const eligible = Math.min(clientCount, Math.max(8, Math.floor(((offset + DEMO_PAST_DAYS) / DEMO_PAST_DAYS) * clientCount)));
        const clientIndex = random() < 0.12 ? eligible - 1 : Math.floor(random() * random() * eligible);
        const isPast = endAt.getTime() <= now.getTime();
        const status: AppointmentStatus = isPast
          ? pastStatus(random)
          : random() < 0.05
            ? "CANCELLED"
            : "CONFIRMED";
        const appointment: DemoAppointment = {
          professionalId: professional.id,
          serviceId: service.id,
          clientIndex,
          startAt,
          endAt,
          status,
          priceCents: service.priceCents,
          payments: [],
          createdAt: bookedAt(startAt, now, isPast, random),
        };
        if (status === "COMPLETED") appointment.payments = paymentsFor(appointment, professional.commissionPercent, random, -offset);
        appointments.push(appointment);
        cursor += Math.ceil(service.durationMin / SLOT_STEP) * SLOT_STEP;
      }
    }
  }
  return appointments;
}
