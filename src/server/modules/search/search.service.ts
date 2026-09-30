import { utcToLocalDate } from "@/lib/date";
import { normalizePhoneBR } from "@/lib/phone";
import { prisma } from "@/server/db/prisma";

const LIMIT = 5;

export interface SearchResults {
  clients: { id: string; name: string; phone: string }[];
  appointments: { id: string; date: string; startAt: string; clientName: string; serviceName: string }[];
}

/**
 * Busca global do painel (command palette). Sempre restrita ao negócio da
 * sessão. Casa nome por trecho (sem diferenciar maiúsculas) e telefone por dígitos.
 */
export async function searchAdmin(
  businessId: string,
  query: string,
  timeZone: string,
  /** Profissional: só os próprios clientes e agendamentos. */
  scope: { professionalId?: string } = {},
): Promise<SearchResults> {
  const term = query.trim();
  if (term.length < 2) return { clients: [], appointments: [] };

  const digits = normalizePhoneBR(term);
  const clientMatch = {
    OR: [
      { name: { contains: term, mode: "insensitive" as const } },
      ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
    ],
  };

  const [clients, appointments] = await Promise.all([
    prisma.client.findMany({
      where: {
        businessId,
        ...clientMatch,
        ...(scope.professionalId ? { appointments: { some: { professionalId: scope.professionalId } } } : {}),
      },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
      take: LIMIT,
    }),
    prisma.appointment.findMany({
      where: {
        businessId,
        ...scope,
        status: { in: ["PENDING", "CONFIRMED"] },
        startAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        client: clientMatch,
      },
      include: { client: { select: { name: true } }, service: { select: { name: true } } },
      orderBy: { startAt: "asc" },
      take: LIMIT,
    }),
  ]);

  return {
    clients,
    appointments: appointments.map((a) => ({
      id: a.id,
      date: utcToLocalDate(a.startAt, timeZone),
      startAt: a.startAt.toISOString(),
      clientName: a.client.name,
      serviceName: a.service.name,
    })),
  };
}
