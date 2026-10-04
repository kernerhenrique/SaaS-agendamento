import { normalizePhoneBR } from "@/lib/phone";
import { prisma } from "@/server/db/prisma";
import { NotFoundError, ValidationError } from "@/server/errors";

import {
  applyClientFilter,
  collectTags,
  deletedClientPhone,
  DELETED_CLIENT_NAME,
  hasTag,
  matchesClientSearch,
  parseClientContact,
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
  options: { query?: string; filter: ClientFilter; tag?: string | null },
  now = new Date(),
  scope: ClientScope = {},
): Promise<ClientListRow[]> {
  const clients = await prisma.client.findMany({
    where: { businessId, deletedAt: null, ...scopedClientWhere(scope) },
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
    .filter((client) => matchesClientSearch(client, options.query ?? "") && hasTag(client, options.tag))
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
    where: { id: clientId, businessId, deletedAt: null, ...scopedClientWhere(scope) },
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
    /** Marcados daqui para frente (excluir o cadastro cancela todos). */
    upcomingCount: appointments.filter((a) => a.startAt > now && (a.status === "PENDING" || a.status === "CONFIRMED")).length,
    totalSpentCents: spent ? (spent._sum.amountCents ?? 0) : null,
    // Futuros e passados em listas separadas na tela: cada lado com a sua cota,
    // senão um horário fixo longo esconderia todo o passado.
    history: [
      ...appointments.filter((a) => a.startAt > now).slice(-CLIENT_HISTORY_LIMIT / 2),
      ...appointments.filter((a) => a.startAt <= now).slice(0, CLIENT_HISTORY_LIMIT / 2),
    ],
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
    where: { id: clientId, businessId, deletedAt: null, ...scopedClientWhere(actor.scope ?? {}) },
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
    where: { businessId, phone, deletedAt: null, ...scopedClientWhere(scope) },
    select: { id: true, name: true, phone: true, email: true },
  });
}

/** Tags em uso (para o filtro da lista), só dos clientes que a pessoa enxerga. */
export async function listClientTags(businessId: string, scope: ClientScope = {}): Promise<string[]> {
  const clients = await prisma.client.findMany({
    where: { businessId, deletedAt: null, NOT: { tags: { isEmpty: true } }, ...scopedClientWhere(scope) },
    select: { tags: true },
  });
  return collectTags(clients);
}

/**
 * Corrige nome, WhatsApp e e-mail (só o dono: o profissional não renomeia
 * cadastro existente). O telefone continua sendo a chave: se já for de outro
 * cadastro, recusa dizendo de quem (juntar dois cadastros fica para o suporte).
 */
export async function updateClientContact(businessId: string, clientId: string, input: { name: unknown; phone: unknown; email: unknown }) {
  let contact: ReturnType<typeof parseClientContact>;
  try {
    contact = parseClientContact(input, normalizePhoneBR);
  } catch (error) {
    throw new ValidationError((error as Error).message);
  }
  const existing = await prisma.client.findFirst({ where: { id: clientId, businessId, deletedAt: null }, select: { id: true } });
  if (!existing) throw new NotFoundError("Cadastro não encontrado");
  const samePhone = await prisma.client.findFirst({
    where: { businessId, phone: contact.phone, NOT: { id: clientId } },
    select: { name: true },
  });
  if (samePhone) throw new ValidationError(`Esse WhatsApp já é do cadastro "${samePhone.name}"`);
  return prisma.client.update({
    where: { id: clientId },
    data: contact,
    select: { id: true, name: true, phone: true, email: true },
  });
}

/**
 * Exclui o cliente a pedido (LGPD): apaga os dados pessoais (nome, telefone,
 * e-mail, notas, tags e as observações dos agendamentos) e cancela o que
 * estava marcado para frente. Atendimentos e pagamentos antigos continuam,
 * sem nome, para os relatórios e o financeiro não mudarem.
 */
export async function deleteClient(businessId: string, clientId: string, actorUserId: string, now = new Date()) {
  const existing = await prisma.client.findFirst({ where: { id: clientId, businessId, deletedAt: null }, select: { id: true } });
  if (!existing) throw new NotFoundError("Cadastro não encontrado");
  return prisma.$transaction(async (tx) => {
    const cancelled = await tx.appointment.updateMany({
      where: { businessId, clientId, status: { in: ["PENDING", "CONFIRMED"] }, startAt: { gt: now } },
      data: { status: "CANCELLED", cancelledByUserId: actorUserId },
    });
    await tx.appointment.updateMany({ where: { businessId, clientId }, data: { notes: null } });
    await tx.client.update({
      where: { id: clientId },
      data: {
        name: DELETED_CLIENT_NAME,
        phone: deletedClientPhone(clientId),
        email: null,
        internalNotes: null,
        tags: [],
        notesUpdatedByUserId: null,
        notesUpdatedAt: null,
        deletedAt: now,
      },
    });
    return { cancelledAppointments: cancelled.count };
  });
}
