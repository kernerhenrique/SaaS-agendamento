import nodemailer, { type Transporter } from "nodemailer";

import { BRAND } from "@/config/brand";

type Env = Record<string, string | undefined>;

export interface MailConfig {
  transport: { host: string; port: number; secure: boolean; auth: { user: string; pass: string } } | { service: "gmail"; auth: { user: string; pass: string } };
  /** Endereço que envia (um só para todos os negócios, ex.: nao-responda@aprazzo.com.br). */
  fromAddress: string;
}

/**
 * Lê a configuração de envio. SMTP genérico (`SMTP_HOST`, `SMTP_PORT`,
 * `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`) tem prioridade — e-mail do domínio
 * (Hostinger) ou um serviço transacional; o Gmail (`GMAIL_USER` +
 * `GMAIL_APP_PASSWORD`) continua aceito. Sem nenhum dos dois, `null`.
 */
export function resolveMailConfig(env: Env): MailConfig | null {
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    const port = Number(env.SMTP_PORT) || 465;
    return {
      // 465 = TLS direto; 587 = STARTTLS (secure false, o nodemailer sobe o TLS).
      transport: { host: env.SMTP_HOST, port, secure: port === 465, auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } },
      fromAddress: env.EMAIL_FROM || env.SMTP_USER,
    };
  }
  if (env.GMAIL_USER && env.GMAIL_APP_PASSWORD) {
    return { transport: { service: "gmail", auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD } }, fromAddress: env.GMAIL_USER };
  }
  return null;
}

let cachedTransporter: Transporter | null = null;

function getTransporter(config: MailConfig): Transporter {
  cachedTransporter ??= nodemailer.createTransport(config.transport);
  return cachedTransporter;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Nome exibido no "De:" (ex.: o nome do negócio). Padrão: Aprazzo. */
  fromName?: string;
  /** Para onde vai a resposta do destinatário (ex.: e-mail do dono do negócio). */
  replyTo?: string;
}

/**
 * Envia um e-mail. O endereço é sempre o da plataforma (só ele passa no
 * SPF/DKIM do domínio); o negócio aparece no nome exibido e recebe as
 * respostas pelo Reply-To. Sem credenciais — comum em dev — loga o conteúdo
 * no console em vez de falhar, para não quebrar o fluxo de agendamento por
 * causa de um recurso secundário (notificação).
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  const { to, subject, html, text, fromName, replyTo } = params;
  const config = resolveMailConfig(process.env);

  if (!config) {
    console.warn(
      `[email] SMTP_* (ou GMAIL_*) não configurados — e-mail para "${to}" não foi enviado.\n` +
        `De: ${fromName ?? BRAND.name}${replyTo ? ` (responder para ${replyTo})` : ""}\nAssunto: ${subject}\n${text}`,
    );
    return;
  }

  await getTransporter(config).sendMail({
    // Objeto em vez de string: o nodemailer cuida de aspas e acentos no nome.
    from: { name: fromName ?? BRAND.name, address: config.fromAddress },
    to,
    replyTo,
    subject,
    html,
    text,
  });
}
