import "dotenv/config";

import { localDateInDays } from "./helpers";

/**
 * Acesso direto ao banco LOCAL para preparar cenários que a API não cria de
 * propósito — ex.: um atendimento que já aconteceu (o painel só encaixa até
 * 15 min no passado, e "Concluir" só vale depois do início). Usa o driver
 * `pg` (o client gerado do Prisma é ESM e não carrega no executor do Playwright).
 */
interface PgClient {
  connect(): Promise<void>;
  query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  end(): Promise<void>;
}

async function withDb<T>(work: (client: PgClient) => Promise<T>): Promise<T> {
  const url = process.env.DATABASE_URL ?? "";
  if (!/localhost|127\.0\.0\.1/.test(url)) throw new Error("tests/e2e/db.ts só roda contra o banco local");
  const moduleName = "pg";
  const pg = (await import(moduleName)) as { default: { Client: new (config: { connectionString: string }) => PgClient } };
  // `?schema=public` é coisa do Prisma; o pg não entende.
  const client = new pg.default.Client({ connectionString: url.replace(/[?&]schema=[^&]*/, "") });
  await client.connect();
  try {
    return await work(client);
  } finally {
    await client.end();
  }
}

/**
 * Leva o agendamento para o passado (ontem; se ontem já estiver cheio de testes
 * anteriores, os dias antes dele), num quarto de hora livre: a exclusion constraint
 * recusa sobreposição. Devolve o dia (YYYY-MM-DD) e o início.
 */
export async function moveToPast(appointmentId: string): Promise<{ date: string; startAt: string }> {
  return withDb(async (client) => {
    const { rows } = await client.query(`SELECT "startAt", "endAt" FROM "Appointment" WHERE id = $1`, [appointmentId]);
    if (rows.length === 0) throw new Error(`Agendamento ${appointmentId} não encontrado`);
    const durationMs = (rows[0].endAt as Date).getTime() - (rows[0].startAt as Date).getTime();
    for (let daysAgo = 1; daysAgo <= 14; daysAgo++) {
      const date = localDateInDays(-daysAgo);
      const firstQuarter = Math.floor(Math.random() * 64);
      for (let attempt = 0; attempt < 64; attempt++) {
        const minute = 6 * 60 + 15 * ((firstQuarter + attempt) % 64);
        const hhmm = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
        const startAt = new Date(`${date}T${hhmm}:00-03:00`);
        try {
          await client.query(`UPDATE "Appointment" SET "startAt" = $1, "endAt" = $2 WHERE id = $3`, [
            startAt,
            new Date(startAt.getTime() + durationMs),
            appointmentId,
          ]);
          return { date, startAt: startAt.toISOString() };
        } catch (error) {
          if (!String((error as Error).message).includes("no_overlapping_appointments")) throw error;
        }
      }
    }
    throw new Error("Nenhum horário livre nos últimos 14 dias para o teste");
  });
}

/** Limite do plano de um negócio (null = sem limite, o padrão). Use com try/finally para devolver null. */
export async function setProfessionalLimit(slug: string, maxProfessionals: number | null): Promise<void> {
  await withDb((client) => client.query(`UPDATE "Business" SET "maxProfessionals" = $1 WHERE slug = $2`, [maxProfessionals, slug]));
}

/** Ids de cadastros de um negócio (o primeiro de cada): para testar que outro negócio não consegue usá-los. */
export async function businessRefs(slug: string): Promise<{ professionalId: string; serviceId: string; categoryId: string }> {
  return withDb(async (client) => {
    const { rows } = await client.query(
      `SELECT
         (SELECT p.id FROM "Professional" p WHERE p."businessId" = b.id ORDER BY p."createdAt" LIMIT 1) AS "professionalId",
         (SELECT s.id FROM "Service" s WHERE s."businessId" = b.id ORDER BY s."createdAt" LIMIT 1) AS "serviceId",
         (SELECT c.id FROM "ServiceCategory" c WHERE c."businessId" = b.id ORDER BY c."createdAt" LIMIT 1) AS "categoryId"
       FROM "Business" b WHERE b.slug = $1`,
      [slug],
    );
    if (rows.length === 0) throw new Error(`Negócio ${slug} não encontrado`);
    return rows[0] as { professionalId: string; serviceId: string; categoryId: string };
  });
}
