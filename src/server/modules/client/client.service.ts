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
/**
 * Escopo do profissional: só clientes com pelo menos um agendamento com ele
 * (qualquer status), e só os agendamentos com ele contam nos números.
 */
export type ClientScope = { professionalId?: string };

const scopedClientWhere = (scope: ClientScope) =>
  scope.professionalId ? { appointments: { some: { professionalId: scope.professionalId } } } : {};

export async function listClients(
  businessId: string,
  options: { query?: string; filter: ClientFilter },
  now = new Date(),
  scope: ClientScope = {},
): Promise<ClientListRow[]> {
  const clients = await prisma.client.findMany({
    where: { businessId, ...scopedClientWhere(scope) },
    select: {
      id: true,
      name: true,
      phone: true,
      tags: true,
      appointments: { where: scope, select: { status: true, startAt: true } },
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

/**
 * Ficha do cliente: dados, notas/tags e histórico (mais recentes primeiro).
 * Profissional (`scope`): só o histórico com ele e sem o total gasto; as notas
 * e tags são compartilhadas entre quem atende, com "editado por".
 */
export async function getClientDetail(businessId: string, clientId: string, now = new Date(), scope: ClientScope = {}) {
  const client = await prisma.client.findFirst({
    where: { id: clientId, businessId, ...scopedClientWhere(scope) },
    include: {
      appointments: {
        where: scope,
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

  // Total gasto = tudo que foi efetivamente recebido nos atendimentos dele (só o dono vê).
  const [spent, notesEditor] = await Promise.all([
    scope.professionalId
      ? null
      : prisma.payment.aggregate({
          where: { businessId, deletedAt: null, appointment: { clientId } },
          _sum: { amountCents: true },
        }),
    client.notesUpdatedByUserId
      ? prisma.user.findUnique({ where: { id: client.notesUpdatedByUserId }, select: { name: true } })
      : null,
  ]);

  const { appointments, ...data } = client;
  return {
    client: { ...data, notesUpdatedBy: notesEditor?.name ?? null },
    summary: summarizeClient(appointments, now),
    totalSpentCents: spent ? (spent._sum.amountCents ?? 0) : null,
    history: appointments.slice(0, CLIENT_HISTORY_LIMIT),
  };
}

export async function updateClientNotes(
  businessId: string,
  clientId: string,
  input: { internalNotes: string | null; tags: string[] },
  actor: { userId: string; scope?: ClientScope } = { userId: "" },
) {
  const notes = input.internalNotes?.trim() || null;
  if (notes && notes.length > MAX_NOTES_LENGTH) {
    throw new ValidationError(`As notas podem ter no máximo ${MAX_NOTES_LENGTH} caracteres`);
  }
  const existing = await prisma.client.findFirst({
    where: { id: clientId, businessId, ...scopedClientWhere(actor.scope ?? {}) },
    select: { id: true },
  });
  if (!existing) throw new NotFoundError("Cadastro não encontrado");

  return prisma.client.update({
    where: { id: clientId },
    data: {
      internalNotes: notes,
      tags: normalizeTags(input.tags),
      notesUpdatedByUserId: actor.userId || null,
      notesUpdatedAt: new Date(),
    },
    select: { id: true, internalNotes: true, tags: true, notesUpdatedAt: true },
  });
}

/**
 * Cliente já cadastrado com este telefone (o formulário de novo agendamento
 * mostra "cliente encontrado" em vez de renomear sem avisar). null se o número
 * ainda está incompleto ou não existe.
 */
export async function findClientByPhone(businessId: string, rawPhone: string, scope: ClientScope = {}) {
  const phone = normalizePhoneBR(rawPhone);
  if (phone.length < 10) return null;
  // Profissional: cliente de colega não aparece (não revela a base do colega);
  // ao salvar, o agendamento se liga ao mesmo cadastro, sem duplicar.
  return prisma.client.findFirst({
    where: { businessId, phone, ...scopedClientWhere(scope) },
    select: { id: true, name: true, phone: true, email: true },
  });
}
