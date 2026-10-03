import { getVertical } from "@/config/vertical";
import { buildManageUrl } from "@/server/app-url";
import { sendEmail } from "@/server/modules/notification/email";

export interface AppointmentConfirmationEmailData {
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
    `Seu horário em ${data.businessName} está reservado!`,
    "",
    `${terms.service.singular}: ${data.serviceName}`,
    `${terms.professional.singular}: ${data.professionalName}`,
    `Data/hora: ${formattedDateTime}`,
    "",
    `Confirme sua presença, remarque ou cancele por aqui: ${manageUrl}`,
  ].join("\n");

  const html = `
    <p>Olá ${escapeHtml(data.clientName)},</p>
    <p>Seu horário em <strong>${escapeHtml(data.businessName)}</strong> está reservado!</p>
    <ul>
      <li><strong>${terms.service.singular}:</strong> ${escapeHtml(data.serviceName)}</li>
      <li><strong>${terms.professional.singular}:</strong> ${escapeHtml(data.professionalName)}</li>
      <li><strong>Data/hora:</strong> ${formattedDateTime}</li>
    </ul>
    <p><a href="${manageUrl}"><strong>Confirmar presença</strong></a>: pelo mesmo link você remarca ou cancela.</p>
  `;

  await sendEmail({
    to: data.clientEmail,
    subject: `Horário reservado — ${data.businessName}`,
    html,
    text,
  });
}
