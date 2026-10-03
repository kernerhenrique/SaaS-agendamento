/** Endereço público do app (APP_BASE_URL), usado em links enviados ao cliente. */
export function getAppBaseUrl(): string {
  return process.env.APP_BASE_URL ?? "http://localhost:3000";
}

/** Link de gerenciar (cancelar ou remarcar) enviado ao cliente por e-mail e WhatsApp. */
export function buildManageUrl(manageToken: string): string {
  return `${getAppBaseUrl()}/agendamento/${manageToken}/gerenciar`;
}

/** Página de reservas do negócio, para o cliente "reservar de novo". */
export function buildBookingUrl(slug: string): string {
  return `${getAppBaseUrl()}/${slug}`;
}
