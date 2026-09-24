import nodemailer, { type Transporter } from "nodemailer";

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
  return cachedTransporter;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Envia um e-mail via Gmail SMTP (App Password). Se as credenciais não
 * estiverem configuradas — comum em dev antes de preencher o .env — loga o
 * conteúdo no console em vez de falhar, para não quebrar o fluxo de
 * agendamento por causa de um recurso secundário (notificação).
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  const { to, subject, html, text } = params;

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn(
      `[email] GMAIL_USER/GMAIL_APP_PASSWORD não configurados — e-mail para "${to}" não foi enviado.\n` +
        `Assunto: ${subject}\n${text}`,
    );
    return;
  }

  await getTransporter().sendMail({
    from: process.env.GMAIL_USER,
    to,
    subject,
    html,
    text,
  });
}
