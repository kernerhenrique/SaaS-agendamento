import { normalizePhoneBR } from "@/lib/phone";
import { prisma } from "@/server/db/prisma";
import { NotFoundError, ValidationError } from "@/server/errors";

import {
  applyClientFilter,
  matchesClientSearch,
  normalizeTags,
  summarizeClient,
  type ClientFilter,
} from "./client-rules";

const MAX_NOTES_LENGTH = 2000;
const CLIENT_HISTORY_LIMIT = 50;

export interface ClientListRow {
  id: string;
  name: string;
  phone: string;
  tags: string[];
  completed: number;
  noShows: number;
  lastVisitAt: string | null;
  nextAppointmentAt: string | null;
}

/**
 * Lista da tela de Clientes. Negócios do porte alvo têm centenas/poucos
 * milhares de clientes: carrega status e datas dos agendamentos e resume em
 * memória com as regras puras (mais simples e testável que SQL agregado).
 */
export async function listClients(
  businessId: string,
  options: { query?: string; filter: ClientFilter },
  now = new Date(),
): Promise<ClientListRow[]> {
  const clients = await prisma.client.findMany({
    where: { businessId },
    select: {
      id: true,
      name: true,
      phone: true,
      tags: true,
      appointments: { select: { status: true, startAt: true } },
    },
    orderBy: { name: "asc" },
  });

  const rows = clients
    .filter((client) => matchesClientSearch(client, options.query ?? ""))
    .map((client) => ({ client, summary: summarizeClient(client.appointments, now) }));

  return applyClientFilter(rows, options.filter, now).map(({ client, summary }) => ({
    id: client.id,
    name: client.name,
    phone: client.phone,
    tags: client.tags,
    completed: summary.completed,
    noShows: summary.noShows,
    lastVisitAt: summary.lastVisitAt?.toISOString() ?? null,
    nextAppointmentAt: summary.nextAppointmentAt?.toISOString() ?? null,
  }));
}

/** Ficha do cliente: dados, notas/tags e histórico (mais recentes primeiro). */
export async function getClientDetail(businessId: string, clientId: string, now = new Date()) {
  const client = await prisma.client.findFirst({
    where: { id: clientId, businessId },
    include: {
      appointments: {
        select: {
          id: true,
          status: true,
          startAt: true,
          service: { select: { name: true } },
          professional: { select: { name: true } },
        },
        orderBy: { startAt: "desc" },
      },
    },
  });
  if (!client) throw new NotFoundError("Cadastro não encontrado");

  const { appointments, ...data } = client;
  return {
    client: data,
    summary: summarizeClient(appointments, now),
    history: appointments.slice(0, CLIENT_HISTORY_LIMIT),
  };
}

export async function updateClientNotes(
  businessId: string,
  clientId: string,
  input: { internalNotes: string | null; tags: string[] },
) {
  const notes = input.internalNotes?.trim() || null;
  if (notes && notes.length > MAX_NOTES_LENGTH) {
    throw new ValidationError(`As notas podem ter no máximo ${MAX_NOTES_LENGTH} caracteres`);
  }
  const existing = await prisma.client.findFirst({ where: { id: clientId, businessId }, select: { id: true } });
  if (!existing) throw new NotFoundError("Cadastro não encontrado");

  return prisma.client.update({
    where: { id: clientId },
    data: { internalNotes: notes, tags: normalizeTags(input.tags) },
    select: { id: true, internalNotes: true, tags: true },
  });
}

/**
 * Cliente já cadastrado com este telefone (o formulário de novo agendamento
 * mostra "cliente encontrado" em vez de renomear sem avisar). null se o número
 * ainda está incompleto ou não existe.
 */
export async function findClientByPhone(businessId: string, rawPhone: string) {
  const phone = normalizePhoneBR(rawPhone);
  if (phone.length < 10) return null;
  return prisma.client.findUnique({
    where: { businessId_phone: { businessId, phone } },
    select: { id: true, name: true, phone: true, email: true },
  });
}
