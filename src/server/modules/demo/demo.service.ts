import { randomBytes, randomUUID } from "node:crypto";

import { getAppBaseUrl } from "@/server/app-url";
import { prisma } from "@/server/db/prisma";
import { ForbiddenError } from "@/server/errors";
import { hashPassword } from "@/server/modules/auth/password";
import type { NewClientInput } from "@/server/modules/onboarding/client-file";
import { insertClientBusiness } from "@/server/modules/onboarding/onboarding.service";

import { buildDemoClients, buildDemoSchedule } from "./demo-data";

/**
 * Demonstração: um negócio comum marcado `isDemo`, com dados de exemplo
 * recriados toda madrugada (cron), um "dono visitante" sem senha utilizável
 * (só entra pelo botão da página da demo) e as ações que mudariam a demo para
 * todos os visitantes bloqueadas no servidor (`assertNotDemo`).
 */

const DEMO_CLIENTS = 40;
export const DEMO_PREVIEW_DAYS = 7;
export const DEMO_BLOCKED_MESSAGE = "Na demonstração, isso fica desativado. Os dados de exemplo voltam ao original toda madrugada.";

/** Barra as ações que mudariam a demo para os próximos visitantes (configurações, senha, convites, exclusões, modelos). */
export async function assertNotDemo(businessId: string): Promise<void> {
  const business = await prisma.business.findUnique({ where: { id: businessId }, select: { isDemo: true } });
  if (business?.isDemo) throw new ForbiddenError(DEMO_BLOCKED_MESSAGE);
}

/** Demo ativa (não removida nem vencida) pelo slug, ou null. */
function activeDemoWhere(slug: string, now: Date) {
  return { slug, isDemo: true, deletedAt: null, OR: [{ demoExpiresAt: null }, { demoExpiresAt: { gt: now } }] };
}

/** Usuário com que o botão "Ver o painel da demonstração" entra. */
export async function getDemoOwner(slug: string, now = new Date()) {
  const business = await prisma.business.findFirst({ where: activeDemoWhere(slug, now), select: { id: true } });
  if (!business) return null;
  return prisma.user.findFirst({ where: { businessId: business.id, role: "OWNER", disabledAt: null }, orderBy: { createdAt: "asc" } });
}

export async function createDemoBusiness(
  input: NewClientInput,
  images: { logoUrl: string | null; coverUrl: string | null },
  options: { expiresAt: Date | null },
): Promise<{ businessId: string; publicUrl: string; expiresAt: Date | null }> {
  const businessId = await insertClientBusiness(input, images, { expiresAt: options.expiresAt });
  await prisma.user.create({
    data: {
      businessId,
      role: "OWNER",
      name: "Visitante",
      // Domínio .invalid: nunca recebe e-mail. A senha é aleatória e descartada: ninguém entra por login.
      email: `demo-${input.slug}@demo.aprazzo.invalid`,
      passwordHash: await hashPassword(randomBytes(32).toString("hex")),
    },
  });
  await resetDemoData(businessId);
  return { businessId, publicUrl: `${getAppBaseUrl()}/${input.slug}`, expiresAt: options.expiresAt };
}

/**
 * Apaga o que os visitantes fizeram (agendamentos, pagamentos, clientes,
 * bloqueios) e recria os dados de exemplo para o dia de hoje. Catálogo, equipe
 * e marca ficam como estão.
 */
export async function resetDemoData(businessId: string, now = new Date()): Promise<{ appointments: number }> {
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
    select: {
      isDemo: true,
      slug: true,
      timezone: true,
      professionals: {
        where: { deletedAt: null, active: true },
        select: { id: true, commissionPercent: true, workingHours: true, professionalServices: { select: { serviceId: true } } },
      },
      services: { where: { deletedAt: null, active: true }, select: { id: true, durationMin: true, priceCents: true } },
    },
  });
  // Trava de segurança: esta função apaga dados; nunca roda num negócio de verdade.
  if (!business.isDemo) throw new ForbiddenError("Só negócios de demonstração podem ser recriados");

  const clients = buildDemoClients(DEMO_CLIENTS).map((client) => ({ ...client, id: randomUUID() }));
  const schedule = buildDemoSchedule({
    now,
    timezone: business.timezone,
    professionals: business.professionals.map((professional) => ({
      id: professional.id,
      commissionPercent: professional.commissionPercent,
      workingHours: professional.workingHours,
      serviceIds: professional.professionalServices.map((link) => link.serviceId),
    })),
    services: business.services,
    clientCount: clients.length,
    seed: `${business.slug}:${now.toISOString().slice(0, 10)}`,
  }).map((appointment) => ({ ...appointment, id: randomUUID() }));

  await prisma.$transaction(
    async (tx) => {
      // Agendamentos primeiro: eles prendem clientes (Restrict); pagamentos e mensagens vão junto (Cascade).
      await tx.appointment.deleteMany({ where: { businessId } });
      await tx.client.deleteMany({ where: { businessId } });
      await tx.timeBlock.deleteMany({ where: { professional: { businessId } } });
      await tx.staffInvite.deleteMany({ where: { businessId } });

      // Cada cliente "nasce" na primeira visita: "clientes novos" e "novos × que voltaram" ficam com números reais.
      const firstVisit = new Map<number, Date>();
      for (const appointment of schedule) {
        const current = firstVisit.get(appointment.clientIndex);
        if (!current || appointment.startAt < current) firstVisit.set(appointment.clientIndex, appointment.startAt);
      }
      await tx.client.createMany({
        data: clients.map(({ id, name, phone, email, tags, internalNotes }, index) => ({
          id,
          businessId,
          name,
          phone,
          email,
          tags,
          internalNotes,
          createdAt: firstVisit.get(index) ?? now,
        })),
      });
      await tx.appointment.createMany({
        data: schedule.map((appointment) => ({
          id: appointment.id,
          businessId,
          professionalId: appointment.professionalId,
          serviceId: appointment.serviceId,
          clientId: clients[appointment.clientIndex].id,
          startAt: appointment.startAt,
          endAt: appointment.endAt,
          status: appointment.status,
          priceCents: appointment.priceCents,
          createdAt: appointment.createdAt,
          manageToken: randomUUID(),
        })),
      });
      await tx.payment.createMany({
        data: schedule.flatMap((appointment) =>
          appointment.payments.map((payment) => ({ ...payment, businessId, appointmentId: appointment.id })),
        ),
      });
    },
    { timeout: 60_000, maxWait: 10_000 },
  );
  return { appointments: schedule.length };
}

/** Rotina da madrugada: apaga as prévias vencidas e recria os dados das demos ativas. */
export async function runDemoMaintenance(now = new Date()): Promise<{ removed: string[]; reset: string[] }> {
  const expired = await prisma.business.findMany({ where: { isDemo: true, demoExpiresAt: { lte: now } }, select: { id: true, slug: true } });
  for (const business of expired) {
    await prisma.$transaction([
      prisma.appointment.deleteMany({ where: { businessId: business.id } }),
      prisma.business.delete({ where: { id: business.id } }),
    ]);
  }

  const active = await prisma.business.findMany({
    where: { isDemo: true, deletedAt: null, OR: [{ demoExpiresAt: null }, { demoExpiresAt: { gt: now } }] },
    select: { id: true, slug: true },
  });
  for (const business of active) await resetDemoData(business.id, now);
  return { removed: expired.map((b) => b.slug), reset: active.map((b) => b.slug) };
}
