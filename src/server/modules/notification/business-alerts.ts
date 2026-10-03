import { getVertical } from "@/config/vertical";
import { BRAND } from "@/config/brand";
import { formatPhoneBR } from "@/lib/phone";
import { getAppBaseUrl } from "@/server/app-url";
import { prisma } from "@/server/db/prisma";

import { sendEmail } from "./email";

/**
 * Aviso por e-mail ao negócio quando o CLIENTE mexe na agenda pela página ou
 * pelo link (reserva nova, cancelamento, remarcação): sem isso, ninguém fica
 * sabendo até abrir o painel. Vai para os donos e para o profissional do
 * atendimento (se ele tem acesso). Nunca sai de uma demonstração.
 */
export type ClientAction = "NEW" | "CANCELLED" | "RESCHEDULED";

const SUBJECTS: Record<ClientAction, string> = {
  NEW: "Nova reserva",
  CANCELLED: "Reserva cancelada pelo cliente",
  RESCHEDULED: "Reserva remarcada pelo cliente",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

/** Destinatários: donos ativos + o profissional do atendimento, sem e-mails fictícios (.invalid). */
export function alertRecipients(users: { email: string; role: string; professionalId: string | null }[], professionalId: string): string[] {
  return [
    ...new Set(
      users
        .filter((user) => user.role === "OWNER" || user.professionalId === professionalId)
        .map((user) => user.email)
        .filter((email) => !email.endsWith(".invalid")),
    ),
  ];
}

export async function notifyBusinessOfClientAction(appointmentId: string, action: ClientAction, previousStartAt?: Date): Promise<void> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      business: { include: { users: { where: { disabledAt: null }, select: { email: true, role: true, professionalId: true } } } },
      professional: true,
      service: true,
      client: true,
    },
  });
  if (!appointment || appointment.business.isDemo) return;
  const to = alertRecipients(appointment.business.users, appointment.professionalId);
  if (to.length === 0) return;

  const { terms } = getVertical(appointment.business.businessType);
  const format = (date: Date) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: appointment.business.timezone, dateStyle: "full", timeStyle: "short" }).format(date);
  const when = format(appointment.startAt);
  const panelUrl = `${getAppBaseUrl()}/admin/agenda`;
  const lines: [string, string][] = [
    [terms.client.singular, `${appointment.client.name} · ${formatPhoneBR(appointment.client.phone)}`],
    [terms.service.singular, appointment.service.name],
    [terms.professional.singular, appointment.professional.name],
    [action === "RESCHEDULED" ? "Novo horário" : "Horário", when],
  ];
  if (action === "RESCHEDULED" && previousStartAt) lines.push(["Antes", format(previousStartAt)]);

  const subject = `${SUBJECTS[action]} — ${appointment.service.name}, ${when}`;
  const text = [
    `${SUBJECTS[action]} em ${appointment.business.name}:`,
    "",
    ...lines.map(([label, value]) => `${label}: ${value}`),
    "",
    `Ver na agenda: ${panelUrl}`,
    `Aviso automático da ${BRAND.name}.`,
  ].join("\n");
  const html = `
    <p><strong>${escapeHtml(SUBJECTS[action])}</strong> em ${escapeHtml(appointment.business.name)}:</p>
    <ul>${lines.map(([label, value]) => `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</li>`).join("")}</ul>
    <p><a href="${panelUrl}">Ver na agenda</a></p>
    <p><small>Aviso automático da ${BRAND.name}.</small></p>
  `;
  await sendEmail({ to: to.join(", "), subject, html, text });
}
