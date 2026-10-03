/**
 * Suporte: link para alguém do painel criar uma senha nova, para mandar pelo
 * WhatsApp quando o e-mail não chega (vale 24 horas e só funciona uma vez).
 *
 *   npm run link-senha -- dono@barbearia.com              banco local
 *   npm run link-senha -- dono@barbearia.com --producao   aprazzo.com.br
 *
 * Ambiente e trava de banco errado: scripts/lib/script-env.ts.
 */
import { fail, loadScriptEnvironment } from "./lib/script-env";

async function main() {
  const args = process.argv.slice(2);
  const production = args.includes("--producao");
  const email = args.find((arg) => !arg.startsWith("--"));
  if (!email) fail("Informe o e-mail: npm run link-senha -- dono@barbearia.com [--producao]");
  const unknown = args.find((arg) => arg.startsWith("--") && arg !== "--producao");
  if (unknown) fail(`Opção desconhecida: ${unknown}`);

  loadScriptEnvironment(production);
  const { createSupportResetLink } = await import("@/server/modules/auth/password-reset.service");
  const { ValidationError } = await import("@/server/errors");
  const { prisma } = await import("@/server/db/prisma");
  try {
    const link = await createSupportResetLink(email);
    const until = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(link.expiresAt);
    console.log(`\n✔ Link criado para ${link.name} (${link.businessName}), válido até ${until}.\n`);
    console.log("Mensagem (WhatsApp):\n");
    console.log(`  Olá, ${link.name}! Para criar uma senha nova no painel de ${link.businessName}, use este link (vale até ${until} e só funciona uma vez):`);
    console.log(`  ${link.url}\n`);
  } catch (error) {
    if (error instanceof ValidationError) fail(error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
