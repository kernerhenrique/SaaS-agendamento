/**
 * Suporte: muda o limite do plano (quantos profissionais ATIVOS o negócio pode ter),
 * quando o cliente troca de plano. Sem o valor, só mostra o limite atual.
 *
 *   npm run limite-profissionais -- barbearia-do-ze                 mostra
 *   npm run limite-profissionais -- barbearia-do-ze 3               até 3 ativos
 *   npm run limite-profissionais -- barbearia-do-ze sem --producao  sem limite, em aprazzo.com.br
 *
 * Baixar o limite não desativa ninguém: só impede ativar mais gente até ficar abaixo dele.
 * Ambiente e trava de banco errado: scripts/lib/script-env.ts.
 */
import { fail, loadScriptEnvironment } from "./lib/script-env";

const describe = (max: number | null) => (max === null ? "sem limite" : max === 1 ? "1 profissional ativo (Solo)" : `até ${max} profissionais ativos`);

async function main() {
  const args = process.argv.slice(2);
  const production = args.includes("--producao");
  const [slug, value] = args.filter((arg) => !arg.startsWith("--"));
  if (!slug) fail("Informe o negócio: npm run limite-profissionais -- <slug> [número | sem] [--producao]");
  const unknown = args.find((arg) => arg.startsWith("--") && arg !== "--producao");
  if (unknown) fail(`Opção desconhecida: ${unknown}`);

  loadScriptEnvironment(production);
  const { parseProfessionalLimit } = await import("@/server/modules/business/plan-rules");
  const { prisma } = await import("@/server/db/prisma");
  try {
    const business = await prisma.business.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true, name: true, maxProfessionals: true },
    });
    if (!business) fail(`Negócio não encontrado: ${slug}`);
    const active = await prisma.professional.count({ where: { businessId: business.id, active: true, deletedAt: null } });
    console.log(`\n${business.name}: ${describe(business.maxProfessionals)} · ${active} ativo(s) hoje.`);
    if (value === undefined) return console.log("");

    let next: number | null;
    try {
      next = parseProfessionalLimit(value);
    } catch (error) {
      fail((error as Error).message);
    }
    await prisma.business.update({ where: { id: business.id }, data: { maxProfessionals: next } });
    console.log(`✔ Novo limite: ${describe(next)}.`);
    if (next !== null && active > next) {
      console.log(`  ⚠ Já há ${active} ativos: ninguém foi desativado, mas não dá para ativar outra pessoa até ficar abaixo de ${next}.`);
    }
    console.log("");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
