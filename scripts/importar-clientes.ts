/**
 * Entrega: importa a planilha de clientes de um negócio (o mesmo importador da
 * tela Clientes › Importar planilha). Sem --confirmar só mostra a prévia.
 *
 *   npm run importar-clientes -- <slug> clientes/barbearia-do-ze-clientes.csv                  prévia (banco local)
 *   npm run importar-clientes -- <slug> arquivo.csv --confirmar [--atualizar] [--producao]     grava
 *
 * --atualizar: quem já está cadastrado (mesmo telefone) recebe nome/e-mail da planilha
 * e soma observações e tags; sem ele, é pulado. Formato: docs/como-clonar.md.
 */
import { existsSync, readFileSync } from "node:fs";

import { fail, loadScriptEnvironment } from "./lib/script-env";

async function main() {
  const args = process.argv.slice(2);
  const known = ["--producao", "--confirmar", "--atualizar"];
  const unknown = args.find((arg) => arg.startsWith("--") && !known.includes(arg));
  if (unknown) fail(`Opção desconhecida: ${unknown}`);
  const [slug, file] = args.filter((arg) => !arg.startsWith("--"));
  if (!slug || !file) fail("Uso: npm run importar-clientes -- <slug> <arquivo.csv> [--confirmar] [--atualizar] [--producao]");
  if (!existsSync(file)) fail(`Arquivo não encontrado: ${file}`);
  const production = args.includes("--producao");
  const apply = args.includes("--confirmar");
  const mode = args.includes("--atualizar") ? "update" : "skip";

  loadScriptEnvironment(production);
  const { parseClientImport } = await import("@/server/modules/client/client-import");
  const { importClients } = await import("@/server/modules/client/client-import.service");
  const { prisma } = await import("@/server/db/prisma");
  try {
    const business = await prisma.business.findUnique({ where: { slug }, select: { id: true, name: true } });
    if (!business) fail(`Nenhum negócio com o endereço "${slug}"`);
    const parsed = parseClientImport(readFileSync(file, "utf8"));
    const summary = await importClients(business.id, parsed.rows, { mode, apply: apply && parsed.rows.length > 0 });

    console.log(`\n${production ? "PRODUÇÃO" : "Banco local"} · ${business.name}`);
    console.log(`  ${parsed.rows.length} linhas válidas: ${summary.newCount} novos, ${summary.existingCount} já cadastrados (${mode === "update" ? "atualizar" : "pular"})`);
    for (const problem of [...parsed.errors, ...parsed.duplicatesInFile].slice(0, 20)) console.log(`  ⚠ linha ${problem.line}: ${problem.message}`);
    if (apply) console.log(`\n✔ Importado: ${summary.created} novos, ${summary.updated} atualizados.\n`);
    else console.log("\n(prévia: nada foi gravado; repita com --confirmar)\n");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
