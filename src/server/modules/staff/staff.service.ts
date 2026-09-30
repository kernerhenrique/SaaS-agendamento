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
    invite.professional.deletedAt
  ) {
    throw new NotFoundError(GENERIC_INVITE_ERROR);
  }
  return invite;
}

/** O que a página do convite mostra: negócio, nome do cadastro e o termo do nicho ("Barbeiro"). */
export async function getInviteSummary(token: string) {
  const invite = await findValidInvite(token);
  return {
    businessName: invite.business.name,
    professionalName: invite.professional.name,
    professionalTerm: getVertical(invite.business.businessType).terms.professional.singular,
  };
}

/**
 * Aceite: cria o usuário PROFESSIONAL ligado ao cadastro (ou reativa um
 * acesso revogado) e marca o convite como usado — numa transação, e o convite
 * só pode ser "gasto" uma vez mesmo com dois cliques simultâneos.
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

    const existing = await tx.user.findUnique({ where: { professionalId: invite.professionalId } });
    const emailOwner = await tx.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (emailOwner && emailOwner.id !== existing?.id) {
      throw new ValidationError("Esse e-mail já é usado por outra conta. Use outro e-mail.");
    }

    const data = {
      name: input.name,
      email: input.email,
      passwordHash,
      role: "PROFESSIONAL" as const,
      businessId: invite.businessId,
      professionalId: invite.professionalId,
      disabledAt: null,
    };
    return existing
      ? tx.user.update({ where: { id: existing.id }, data: { ...data, tokenVersion: { increment: 1 } } })
      : tx.user.create({ data });
  });
}
