import { sendEmail } from "@/server/modules/notification/email";

export interface AppointmentConfirmationEmailData {
  clientName: string;
  clientEmail: string;
  businessName: string;
  serviceName: string;
  professionalName: string;
  startAt: Date;
  timezone: string;
  manageToken: string;
}

function getAppBaseUrl(): string {
  return process.env.APP_BASE_URL ?? "http://localhost:3000";
}

export async function sendAppointmentConfirmationEmail(
  data: AppointmentConfirmationEmailData,
): Promise<void> {
  const formattedDateTime = new Intl.DateTimeFormat("pt-BR", {
    timeZone: data.timezone,
    dateStyle: "full",
    timeStyle: "short",
  }).format(data.startAt);

  const manageUrl = `${getAppBaseUrl()}/agendamento/${data.manageToken}/gerenciar`;

  const text = [
    `Olá ${data.clientName},`,
    "",
    `Seu agendamento em ${data.businessName} foi confirmado!`,
    "",
    `Serviço: ${data.serviceName}`,
    `Profissional: ${data.professionalName}`,
    `Data/hora: ${formattedDateTime}`,
    "",
    `Para cancelar ou reagendar, acesse: ${manageUrl}`,
  ].join("\n");

  const html = `
    <p>Olá ${data.clientName},</p>
    <p>Seu agendamento em <strong>${data.businessName}</strong> foi confirmado!</p>
    <ul>
      <li><strong>Serviço:</strong> ${data.serviceName}</li>
      <li><strong>Profissional:</strong> ${data.professionalName}</li>
      <li><strong>Data/hora:</strong> ${formattedDateTime}</li>
    </ul>
    <p>Para cancelar ou reagendar, <a href="${manageUrl}">acesse este link</a>.</p>
  `;

  await sendEmail({
    to: data.clientEmail,
    subject: `Agendamento confirmado — ${data.businessName}`,
    html,
    text,
  });
}
