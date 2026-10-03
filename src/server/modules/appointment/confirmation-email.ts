import { getVertical } from "@/config/vertical";
import { buildManageUrl } from "@/server/app-url";
import { prisma } from "@/server/db/prisma";
import { sendEmail } from "@/server/modules/notification/email";

export interface AppointmentConfirmationEmailData {
  businessId: string;
  clientName: string;
  clientEmail: string;
  businessName: string;
  businessType: string;
  serviceName: string;
  professionalName: string;
  startAt: Date;
  timezone: string;
  manageToken: string;
}

/** Nome do cliente vem do formulário público: nunca interpolar cru no HTML. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * "Responder para" do e-mail ao cliente: o dono ativo mais antigo, para a
 * resposta chegar ao negócio e não à caixa da plataforma. Ignora e-mails
 * fictícios (.invalid, visitante da demo).
 */
export function pickReplyTo(owners: { email: string; disabledAt: Date | null }[]): string | undefined {
  return owners.find((owner) => !owner.disabledAt && !owner.email.endsWith(".invalid"))?.email;
}

export async function sendAppointmentConfirmationEmail(
  data: AppointmentConfirmationEmailData,
): Promise<void> {
  const { terms } = getVertical(data.businessType);
  const formattedDateTime = new Intl.DateTimeFormat("pt-BR", {
    timeZone: data.timezone,
    dateStyle: "full",
    timeStyle: "short",
  }).format(data.startAt);

  const manageUrl = buildManageUrl(data.manageToken);

  const text = [
    `Olá ${data.clientName},`,
    "",
    `Seu horário em ${data.businessName} está confirmado!`,
    "",
    `${terms.service.singular}: ${data.serviceName}`,
    `${terms.professional.singular}: ${data.professionalName}`,
    `Data/hora: ${formattedDateTime}`,
    "",
    `Se precisar cancelar ou remarcar: ${manageUrl}`,
  ].join("\n");

  const html = `
    <p>Olá ${escapeHtml(data.clientName)},</p>
    <p>Seu horário em <strong>${escapeHtml(data.businessName)}</strong> está confirmado!</p>
    <ul>
      <li><strong>${terms.service.singular}:</strong> ${escapeHtml(data.serviceName)}</li>
      <li><strong>${terms.professional.singular}:</strong> ${escapeHtml(data.professionalName)}</li>
      <li><strong>Data/hora:</strong> ${formattedDateTime}</li>
    </ul>
    <p>Se precisar cancelar ou remarcar, <a href="${manageUrl}"><strong>use este link</strong></a>.</p>
  `;

  const owners = await prisma.user.findMany({
    where: { businessId: data.businessId, role: "OWNER" },
    select: { email: true, disabledAt: true },
    orderBy: { createdAt: "asc" },
  });

  // O cliente vê o nome do negócio no "De:"; o endereço continua o da plataforma.
  await sendEmail({
    to: data.clientEmail,
    subject: `Horário confirmado — ${data.businessName}`,
    html,
    text,
    fromName: data.businessName,
    replyTo: pickReplyTo(owners),
  });
}
