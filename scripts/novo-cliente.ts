/**
 * Cria um cliente novo (negócio pronto + link de primeiro acesso do dono).
 *
 *   npm run novo-cliente -- clientes/barbearia-do-ze.json              banco local
 *   npm run novo-cliente -- clientes/barbearia-do-ze.json --simular    só valida e mostra o resumo
 *   npm run novo-cliente -- clientes/barbearia-do-ze.json --producao   aprazzo.com.br
 *
 * Demonstração (sem dono, painel pelo botão da página, dados de exemplo recriados toda madrugada):
 *   npm run novo-cliente -- clientes/barbearia-do-ze.json --demo [--producao]   prévia para um prospect:
 *                                                    endereço <slug>-demo, apagada depois de 7 dias
 *   npm run novo-cliente -- docs/demo-aprazzo.json --demo --permanente --producao   a demo pública (/demo)
 *
 * Outras opções: --slug <endereço> (troca o do arquivo), --json (saída para máquina).
 * Formato do arquivo: docs/exemplo-cliente.json. Passo a passo: docs/como-clonar.md.
 *
 * Ambiente (local × produção) e a trava de banco errado: scripts/lib/script-env.ts.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { fail, loadScriptEnvironment } from "./lib/script-env";

const IMAGE_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

interface Options {
  file: string;
  production: boolean;
  dryRun: boolean;
  slug: string | null;
  json: boolean;
  demo: boolean;
  permanent: boolean;
}

function parseArgs(argv: string[]): Options {
  const options: Options = { file: "", production: false, dryRun: false, slug: null, json: false, demo: false, permanent: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--producao") options.production = true;
    else if (arg === "--simular") options.dryRun = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--demo") options.demo = true;
    else if (arg === "--permanente") options.permanent = true;
    else if (arg === "--slug") options.slug = argv[++i] ?? null;
    else if (arg.startsWith("--")) fail(`Opção desconhecida: ${arg}`);
    else options.file = arg;
  }
  if (!options.file) fail("Informe o arquivo do cliente: npm run novo-cliente -- clientes/<slug>.json");
  if (options.permanent && !options.demo) fail("--permanente só vale junto com --demo");
  return options;
}

async function uploadImage(file: string, baseDir: string, folder: string, kind: "logo" | "capa"): Promise<string> {
  const fullPath = path.resolve(baseDir, file);
  if (!existsSync(fullPath)) fail(`Imagem não encontrada: ${fullPath}`);
  const extension = path.extname(fullPath).toLowerCase();
  const contentType = IMAGE_TYPES[extension];
  if (!contentType) fail(`${kind}: use PNG, JPG, WEBP ou SVG (recebido ${extension || "sem extensão"})`);
  const data = readFileSync(fullPath);
  if (data.byteLength > MAX_IMAGE_BYTES) fail(`${kind}: a imagem passa de 4 MB; reduza antes de enviar`);
  if (!process.env.BLOB_STORE_ID || !process.env.VERCEL_OIDC_TOKEN) {
    fail("Sem credenciais do Blob. Rode: npx vercel env pull .env.vercel.local --environment=production --yes");
  }

  const { put } = await import("@vercel/blob");
  try {
    const blob = await put(`${folder}/${kind}${extension}`, data, { access: "public", contentType, addRandomSuffix: true });
    return blob.url;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    fail(`Não foi possível enviar ${kind} ao Blob (${reason}). Se o token expirou, rode de novo o "npx vercel env pull".`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  loadScriptEnvironment(options.production);

  // Só depois do ambiente carregado: o client do Prisma lê a DATABASE_URL ao ser importado.
  const { parseClientFile, parseSlug } = await import("@/server/modules/onboarding/client-file");
  const { buildDeliveryChecklist, buildDemoMessage, buildOwnerMessage } = await import("@/server/modules/onboarding/delivery-messages");
  const { ValidationError } = await import("@/server/errors");
  const { getVertical } = await import("@/config/vertical");

  const filePath = path.resolve(options.file);
  if (!existsSync(filePath)) fail(`Arquivo não encontrado: ${filePath}`);
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    fail(`O arquivo não é um JSON válido: ${filePath}`);
  }
  if (options.slug) raw.slug = options.slug;

  let parsed: ReturnType<typeof parseClientFile>;
  try {
    parsed = parseClientFile(raw);
    // Prévia por prospect: endereço próprio de demonstração, nunca o slug que o cliente real vai usar.
    if (options.demo && !options.permanent && !parsed.input.slug.endsWith("-demo")) {
      parsed.input.slug = parseSlug(`${parsed.input.slug}-demo`);
    }
  } catch (error) {
    if (error instanceof ValidationError) fail(error.message);
    throw error;
  }
  const { input, warnings } = parsed;
  const vertical = getVertical(input.businessType);
  const { DEMO_PREVIEW_DAYS } = await import("@/server/modules/demo/demo.service");
  const demoExpiresAt = options.demo && !options.permanent ? new Date(Date.now() + DEMO_PREVIEW_DAYS * 24 * 60 * 60 * 1000) : null;

  if (!options.json) {
    const kind = options.demo ? (options.permanent ? " · DEMONSTRAÇÃO PERMANENTE" : ` · DEMONSTRAÇÃO (${DEMO_PREVIEW_DAYS} dias)`) : "";
    console.log(`\n${options.production ? "PRODUÇÃO" : "Banco local"}${kind} · ${input.name} (${vertical.label})`);
    console.log(`  Endereço: ${process.env.APP_BASE_URL}/${input.slug}`);
    console.log(`  ${input.services.length} ${vertical.terms.service.plural.toLowerCase()} · ${input.professionals.length} ${vertical.terms.professional.plural.toLowerCase()}: ${input.professionals.map((p) => p.name).join(", ")}`);
    console.log(`  Cor ${input.accentColor} · logo: ${input.logoFile ?? "sem"} · capa: ${input.coverFile ?? "sem"}`);
    for (const warning of warnings) console.log(`  ⚠ ${warning}`);
  }
  if (options.dryRun) {
    if (!options.json) console.log("\n(simulação: nada foi gravado)\n");
    else console.log(JSON.stringify({ ok: true, dryRun: true, slug: input.slug, warnings }));
    return;
  }

  const baseDir = path.dirname(filePath);
  const folder = `${options.production ? (options.demo ? "demos" : "clientes") : "local"}/${input.slug}`;
  const logoUrl = input.logoFile ? await uploadImage(input.logoFile, baseDir, folder, "logo") : null;
  const coverUrl = input.coverFile ? await uploadImage(input.coverFile, baseDir, folder, "capa") : null;

  const { createClientBusiness } = await import("@/server/modules/onboarding/onboarding.service");
  const { createDemoBusiness } = await import("@/server/modules/demo/demo.service");
  const { prisma } = await import("@/server/db/prisma");
  try {
    if (options.demo) {
      const demo = await createDemoBusiness(input, { logoUrl, coverUrl }, { expiresAt: demoExpiresAt });
      if (options.json) {
        console.log(JSON.stringify({ ok: true, demo: true, slug: input.slug, publicUrl: demo.publicUrl, expiresAt: demo.expiresAt, warnings }));
        return;
      }
      console.log("\n✔ Demonstração criada.\n");
      console.log(`  Link: ${demo.publicUrl}`);
      console.log('  Painel: botão "Ver o painel da demonstração" na própria página (sem senha)');
      console.log("  Dados de exemplo recriados toda madrugada; fora das buscas do Google.\n");
      if (!options.permanent) {
        console.log("Mensagem para o prospect (WhatsApp):\n");
        console.log(buildDemoMessage({ businessName: input.name, publicUrl: demo.publicUrl, expiresAt: demo.expiresAt, timezone: input.timezone }).replace(/^/gm, "  "));
        console.log("");
      }
      return;
    }

    const result = await createClientBusiness(input, { logoUrl, coverUrl });
    const info = {
      businessName: input.name,
      businessType: input.businessType,
      publicUrl: result.publicUrl,
      ownerInviteUrl: result.ownerInvite.url,
      ownerInviteExpiresAt: result.ownerInvite.expiresAt,
      timezone: input.timezone,
    };
    if (options.json) {
      console.log(JSON.stringify({ ok: true, slug: input.slug, ...info, warnings }));
      return;
    }
    console.log("\n✔ Cliente criado.\n");
    console.log("Mensagem para o dono (WhatsApp):\n");
    console.log(buildOwnerMessage(info).replace(/^/gm, "  "));
    console.log("\nAntes de mandar, confira:");
    for (const item of buildDeliveryChecklist(info)) console.log(`  [ ] ${item}`);
    console.log("");
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
