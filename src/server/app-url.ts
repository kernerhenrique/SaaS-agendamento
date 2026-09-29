/** Endereço público do app (APP_BASE_URL), usado em links enviados ao cliente. */
export function getAppBaseUrl(): string {
  return process.env.APP_BASE_URL ?? "http://localhost:3000";
}

/** Link de gerenciar (cancelar, remarcar, avaliar) enviado ao cliente por e-mail e WhatsApp. */
export function buildManageUrl(manageToken: string): string {
  return `${getAppBaseUrl()}/agendamento/${manageToken}/gerenciar`;
}
