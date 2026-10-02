/**
 * Cria um cliente novo (negócio pronto + link de primeiro acesso do dono).
 *
 *   npm run novo-cliente -- clientes/barbearia-do-ze.json              banco local
 *   npm run novo-cliente -- clientes/barbearia-do-ze.json --simular    só valida e mostra o resumo
 *   npm run novo-cliente -- clientes/barbearia-do-ze.json --producao   aprazzo.com.br
 *
 * Outras opções: --slug <endereço> (troca o do arquivo), --json (saída para máquina).
 * Formato do arquivo: docs/exemplo-cliente.json. Passo a passo: docs/como-clonar.md.
 *
 * Produção lê `.env.vercel.local` (gerado por `npx vercel env pull`, traz o Blob)
 * e `.env.producao.local` (DATABASE_URL do Neon, colado à mão). Nenhum dos dois vai
 * para o git, e este script nunca imprime os valores. Nunca use o nome
 * `.env.production.local`: o Next carrega esse arquivo sozinho em `next build`/`start`
 * e o servidor local passaria a usar as variáveis de produção.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { config as loadEnv } from "dotenv";

const PRODUCTION_URL = "https://aprazzo.com.br";
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
}

function parseArgs(argv: string[]): Options {
  const options: Options = { file: "", production: false, dryRun: false, slug: null, json: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--producao") options.production = true;
    else if (arg === "--simular") options.dryRun = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--slug") options.slug = argv[++i] ?? null;
    else if (arg.startsWith("--")) fail(`Opção desconhecida: ${arg}`);
    else options.file = arg;
  }
  if (!options.file) fail("Informe o arquivo do cliente: npm run novo-cliente -- clientes/<slug>.json");
  return options;
}

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

/** Carrega as variáveis do ambiente escolhido e confere que o banco é o esperado. */
function loadEnvironment(production: boolean) {
  if (production) {
    if (!existsSync(".env.producao.local")) fail("Falta .env.producao.local com a DATABASE_URL do Neon (ver docs/publicacao.md)");
    loadEnv({ path: ".env.vercel.local", quiet: true });
    loadEnv({ path: ".env.producao.local", override: true, quiet: true });
    if (!process.env.APP_BASE_URL || process.env.APP_BASE_URL.includes("SENSITIVE")) process.env.APP_BASE_URL = PRODUCTION_URL;
  } else {
    loadEnv({ path: ".env", quiet: true });
    // O Blob é o mesmo nos dois ambientes (pasta "local/" para testes); só as credenciais vêm do arquivo de produção.
    if (existsSync(".env.vercel.local")) {
      const blob = loadEnv({ path: ".env.vercel.local", processEnv: {}, quiet: true }).parsed ?? {};
      for (const key of ["BLOB_STORE_ID", "VERCEL_OIDC_TOKEN"]) {
        if (blob[key] && !process.env[key]) process.env[key] = blob[key];
      }
    }
  }

  const url = process.env.DATABASE_URL ?? "";
  if (!url || url.includes("SENSITIVE")) fail("DATABASE_URL ausente");
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  if (production && isLocal) fail("--producao, mas a DATABASE_URL aponta para o banco local");
  if (!production && !isLocal) fail("Sem --producao, mas a DATABASE_URL não é o banco local; nada foi feito");
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
  loadEnvironment(options.production);

  // Só depois do ambiente carregado: o client do Prisma lê a DATABASE_URL ao ser importado.
  const { parseClientFile } = await import("@/server/modules/onboarding/client-file");
  const { buildDeliveryChecklist, buildOwnerMessage } = await import("@/server/modules/onboarding/delivery-messages");
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
  } catch (error) {
    if (error instanceof ValidationError) fail(error.message);
    throw error;
  }
  const { input, warnings } = parsed;
  const vertical = getVertical(input.businessType);

  if (!options.json) {
    console.log(`\n${options.production ? "PRODUÇÃO" : "Banco local"} · ${input.name} (${vertical.label})`);
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
  const folder = `${options.production ? "clientes" : "local"}/${input.slug}`;
  const logoUrl = input.logoFile ? await uploadImage(input.logoFile, baseDir, folder, "logo") : null;
  const coverUrl = input.coverFile ? await uploadImage(input.coverFile, baseDir, folder, "capa") : null;

  const { createClientBusiness } = await import("@/server/modules/onboarding/onboarding.service");
  const { prisma } = await import("@/server/db/prisma");
  try {
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
