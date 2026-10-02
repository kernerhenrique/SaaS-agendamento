import { getVertical } from "@/config/vertical";
import { getAppBaseUrl } from "@/server/app-url";
import { prisma } from "@/server/db/prisma";
import { NotFoundError, ValidationError } from "@/server/errors";
import { hashPassword } from "@/server/modules/auth/password";

import {
  generateInviteToken,
  hashInviteToken,
  inviteExpiresAt,
  inviteState,
  type InviteAcceptance,
} from "./staff-invite-rules";

/**
 * Acesso da equipe ao painel. Sempre com o `businessId` da sessão do dono;
 * o aceite do convite é público e se apoia só no token.
 */

/** Mensagem genérica: não revela se o convite existe, expirou ou já foi usado. */
const GENERIC_INVITE_ERROR = "Convite inválido ou expirado. Peça um novo link a quem convidou você.";

async function findProfessionalOfBusiness(businessId: string, professionalId: string) {
  const professional = await prisma.professional.findFirst({
    where: { id: professionalId, businessId, deletedAt: null },
    include: { user: { select: { id: true, name: true, email: true, disabledAt: true } } },
  });
  if (!professional) throw new NotFoundError("Cadastro não encontrado");
  return professional;
}

export type StaffAccessStatus = "none" | "invited" | "active" | "revoked";

export interface StaffAccess {
  status: StaffAccessStatus;
  user: { name: string; email: string } | null;
  inviteExpiresAt: string | null;
}

export async function getStaffAccess(businessId: string, professionalId: string): Promise<StaffAccess> {
  const professional = await findProfessionalOfBusiness(businessId, professionalId);
  const now = new Date();
  const invite = await prisma.staffInvite.findFirst({
    where: { professionalId, usedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
  });
  const user = professional.user;
  const status: StaffAccessStatus =
    user && !user.disabledAt ? "active" : invite ? "invited" : user?.disabledAt ? "revoked" : "none";
  return {
    status,
    user: user ? { name: user.name, email: user.email } : null,
    inviteExpiresAt: invite ? invite.expiresAt.toISOString() : null,
  };
}

/** Gera um link novo (o anterior deixa de valer). Devolve o link completo, mostrado uma vez. */
export async function createStaffInvite(
  businessId: string,
  professionalId: string,
  createdByUserId: string,
): Promise<{ url: string; expiresAt: string }> {
  const professional = await findProfessionalOfBusiness(businessId, professionalId);
  if (professional.user && !professional.user.disabledAt) {
    throw new ValidationError("Este cadastro já tem acesso ao painel");
  }
  const token = generateInviteToken();
  const expiresAt = inviteExpiresAt(new Date());
  await prisma.$transaction([
    prisma.staffInvite.deleteMany({ where: { professionalId, usedAt: null } }),
    prisma.staffInvite.create({
      data: { businessId, professionalId, tokenHash: hashInviteToken(token), expiresAt, createdByUserId },
    }),
  ]);
  return { url: `${getAppBaseUrl()}/admin/convite/${token}`, expiresAt: expiresAt.toISOString() };
}

/**
 * Revoga: o usuário não entra nem renova a sessão (`disabledAt` +
 * `tokenVersion`); o access token vigente expira em até 15 min.
 */
export async function revokeStaffAccess(businessId: string, professionalId: string): Promise<void> {
  const professional = await findProfessionalOfBusiness(businessId, professionalId);
  await prisma.$transaction([
    prisma.staffInvite.deleteMany({ where: { professionalId, usedAt: null } }),
    ...(professional.user
      ? [
          prisma.user.update({
            where: { id: professional.user.id },
            data: { disabledAt: new Date(), tokenVersion: { increment: 1 } },
          }),
        ]
      : []),
  ]);
}

async function findValidInvite(token: string) {
  const invite = await prisma.staffInvite.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    include: {
      business: { select: { name: true, businessType: true, deletedAt: true } },
      professional: { select: { id: true, name: true, deletedAt: true } },
    },
  });
  if (
    !invite ||
    inviteState(invite, new Date()) !== "valid" ||
    invite.business.deletedAt ||
    // Convite de profissional depende do cadastro; o de dono não tem cadastro.
    (invite.role === "PROFESSIONAL" && (!invite.professional || invite.professional.deletedAt))
  ) {
    throw new NotFoundError(GENERIC_INVITE_ERROR);
  }
  return invite;
}

/**
 * O que a página do convite mostra: negócio, papel e, para profissional, o
 * nome do cadastro e o termo do nicho ("Barbeiro").
 */
export async function getInviteSummary(token: string) {
  const invite = await findValidInvite(token);
  return {
    businessName: invite.business.name,
    role: invite.role,
    professionalName: invite.professional?.name ?? null,
    professionalTerm: getVertical(invite.business.businessType).terms.professional.singular,
  };
}

/**
 * Primeiro acesso do dono, gerado na criação do cliente (`npm run novo-cliente`):
 * o dono escolhe o próprio e-mail e senha pelo link — ninguém cria nem vê a
 * senha dele. Um link novo invalida o anterior ainda não usado.
 */
export async function createOwnerInvite(businessId: string): Promise<{ url: string; expiresAt: string }> {
  const token = generateInviteToken();
  const expiresAt = inviteExpiresAt(new Date());
  await prisma.$transaction([
    prisma.staffInvite.deleteMany({ where: { businessId, role: "OWNER", usedAt: null } }),
    prisma.staffInvite.create({
      data: { businessId, role: "OWNER", tokenHash: hashInviteToken(token), expiresAt },
    }),
  ]);
  return { url: `${getAppBaseUrl()}/admin/convite/${token}`, expiresAt: expiresAt.toISOString() };
}

/**
 * Aceite, numa transação, e o convite só pode ser "gasto" uma vez mesmo com
 * dois cliques simultâneos:
 * - profissional: cria o usuário PROFESSIONAL ligado ao cadastro (ou reativa um acesso revogado);
 * - dono: cria um usuário OWNER do negócio (sem cadastro da agenda).
 */
export async function acceptStaffInvite(token: string, input: InviteAcceptance) {
  const invite = await findValidInvite(token);
  const passwordHash = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.staffInvite.updateMany({
      where: { id: invite.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) throw new NotFoundError(GENERIC_INVITE_ERROR);

    const existing = invite.professionalId
      ? await tx.user.findUnique({ where: { professionalId: invite.professionalId } })
      : null;
    const emailOwner = await tx.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (emailOwner && emailOwner.id !== existing?.id) {
      throw new ValidationError("Esse e-mail já é usado por outra conta. Use outro e-mail.");
    }

    const data = {
      name: input.name,
      email: input.email,
      passwordHash,
      role: invite.role,
      businessId: invite.businessId,
      professionalId: invite.role === "PROFESSIONAL" ? invite.professionalId : null,
      disabledAt: null,
    };
    return existing
      ? tx.user.update({ where: { id: existing.id }, data: { ...data, tokenVersion: { increment: 1 } } })
      : tx.user.create({ data });
  });
}
