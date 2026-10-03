/**
 * Ambiente dos comandos de suporte (`novo-cliente`, `link-senha`, `remover-cliente`).
 *
 * Produção lê `.env.vercel.local` (gerado por `npx vercel env pull`, traz o Blob)
 * e `.env.producao.local` (DATABASE_URL do Neon, colado à mão). Nenhum dos dois vai
 * para o git, e os comandos nunca imprimem os valores. Nunca use o nome
 * `.env.production.local`: o Next carrega esse arquivo sozinho em `next build`/`start`
 * e o servidor local passaria a usar as variáveis de produção.
 */
import { existsSync } from "node:fs";

import { config as loadEnv } from "dotenv";

export const PRODUCTION_URL = "https://aprazzo.com.br";

export function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

/** Carrega as variáveis do ambiente escolhido e confere que o banco é o esperado. */
export function loadScriptEnvironment(production: boolean): void {
  if (production) {
    if (!existsSync(".env.producao.local")) fail("Falta .env.producao.local com a DATABASE_URL do Neon (ver docs/publicacao.md)");
    loadEnv({ path: ".env.vercel.local", quiet: true });
    loadEnv({ path: ".env.producao.local", override: true, quiet: true });
    if (!process.env.APP_BASE_URL || process.env.APP_BASE_URL.includes("SENSITIVE")) process.env.APP_BASE_URL = PRODUCTION_URL;
  } else {
    loadEnv({ path: ".env", quiet: true });
    // O Blob é o mesmo nos dois ambientes (pasta "local/" para testes); só as credenciais vêm do arquivo da Vercel.
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
