/**
 * Apaga um negócio inteiro (agenda, clientes, pagamentos, equipe e acessos) e
 * as imagens dele no Blob. IRREVERSÍVEL — por isso duas travas:
 *
 *   npm run remover-cliente -- barbearia-do-ze                                   só mostra o que seria apagado
 *   npm run remover-cliente -- barbearia-do-ze --confirmar barbearia-do-ze       apaga (banco local)
 *   npm run remover-cliente -- barbearia-do-ze --confirmar barbearia-do-ze --producao
 *
 * Antes de apagar um cliente real que está saindo, exporte os dados dele
 * (Relatórios › Exportar CSV) e mande para ele. Ambiente: scripts/lib/script-env.ts.
 */
import { fail, loadScriptEnvironment } from "./lib/script-env";

async function main() {
  const args = process.argv.slice(2);
  const production = args.includes("--producao");
  const confirmIndex = args.indexOf("--confirmar");
  const confirmation = confirmIndex >= 0 ? args[confirmIndex + 1] : null;
  // O endereço é o primeiro argumento solto (o valor de --confirmar não conta).
  const slug = args.find((arg, index) => !arg.startsWith("--") && !(confirmIndex >= 0 && index === confirmIndex + 1));
  if (!slug) fail("Informe o endereço: npm run remover-cliente -- <slug> [--confirmar <slug>] [--producao]");
  const unknown = args.find((arg) => arg.startsWith("--") && !["--producao", "--confirmar"].includes(arg));
  if (unknown) fail(`Opção desconhecida: ${unknown}`);

  loadScriptEnvironment(production);
  const { removeClientBusiness, summarizeClientBusiness } = await import("@/server/modules/onboarding/onboarding.service");
  const { ValidationError } = await import("@/server/errors");
  const { prisma } = await import("@/server/db/prisma");
  try {
    const business = await summarizeClientBusiness(slug);
    const counts = business._count;
    console.log(`\n${production ? "PRODUÇÃO" : "Banco local"} · ${business.name} (${slug})${business.isDemo ? " · demonstração" : ""}`);
    console.log(
      `  ${counts.appointments} agendamentos · ${counts.payments} pagamentos · ${counts.clients} clientes · ${counts.professionals} profissionais · ${counts.users} acessos ao painel`,
    );

    if (confirmation !== slug) {
      console.log(`\nNada foi apagado. Para apagar de vez, repita o endereço: --confirmar ${slug}\n`);
      return;
    }

    await removeClientBusiness(slug);
    console.log("\n✔ Negócio apagado do banco.");

    // Imagens no Blob (logo e capa): pasta do ambiente e das prévias de demonstração.
    if (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN) {
      try {
        const { del, list } = await import("@vercel/blob");
        const prefixes = production ? [`clientes/${slug}/`, `demos/${slug}/`] : [`local/${slug}/`];
        const urls = (await Promise.all(prefixes.map((prefix) => list({ prefix })))).flatMap((page) => page.blobs.map((blob) => blob.url));
        if (urls.length > 0) await del(urls);
        console.log(`✔ ${urls.length} ${urls.length === 1 ? "imagem apagada" : "imagens apagadas"} do Blob.\n`);
      } catch (error) {
        console.log(`⚠ O negócio foi apagado, mas as imagens no Blob não (${error instanceof Error ? error.message : error}).\n`);
      }
    } else {
      console.log("⚠ Sem credenciais do Blob: as imagens (se houver) ficaram. Rode o vercel env pull e apague pelo painel da Vercel.\n");
    }
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
