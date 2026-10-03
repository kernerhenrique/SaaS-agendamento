import { prisma } from "@/server/db/prisma";

import type { ImportRow } from "./client-import";

/**
 * Grava a importação. Sem `apply` é só a prévia (quantos são novos e quantos já
 * existem). Telefone é a chave do cliente (mesma regra do resto do sistema):
 * quem já existe é pulado ou atualizado, nunca duplicado.
 * - pular: o cadastro existente fica como está;
 * - atualizar: nome e e-mail do arquivo substituem; observações e tags somam.
 */
export type ImportMode = "skip" | "update";

export interface ImportSummary {
  newCount: number;
  existingCount: number;
  created: number;
  updated: number;
  /** Primeiros já cadastrados, para a prévia mostrar ("linha 4: Ana — já cadastrada como Ana Paula"). */
  existingSample: { line: number; name: string; currentName: string }[];
}

export async function importClients(
  businessId: string,
  rows: ImportRow[],
  options: { mode: ImportMode; apply: boolean },
): Promise<ImportSummary> {
  const existing = await prisma.client.findMany({
    where: { businessId, phone: { in: rows.map((row) => row.phone) } },
    select: { id: true, phone: true, name: true, internalNotes: true, tags: true },
  });
  const byPhone = new Map(existing.map((client) => [client.phone, client]));
  const fresh = rows.filter((row) => !byPhone.has(row.phone));
  const known = rows.filter((row) => byPhone.has(row.phone));

  const summary: ImportSummary = {
    newCount: fresh.length,
    existingCount: known.length,
    created: 0,
    updated: 0,
    existingSample: known.slice(0, 5).map((row) => ({ line: row.line, name: row.name, currentName: byPhone.get(row.phone)!.name })),
  };
  if (!options.apply) return summary;

  await prisma.$transaction(
    async (tx) => {
      // skipDuplicates: se alguém cadastrar o mesmo telefone no meio da importação, não quebra.
      const created = await tx.client.createMany({
        data: fresh.map((row) => ({ businessId, name: row.name, phone: row.phone, email: row.email, internalNotes: row.notes, tags: row.tags })),
        skipDuplicates: true,
      });
      summary.created = created.count;

      if (options.mode === "update") {
        for (const row of known) {
          const current = byPhone.get(row.phone)!;
          const notes = [current.internalNotes, row.notes].filter(Boolean).join("\n");
          await tx.client.update({
            where: { id: current.id },
            data: {
              name: row.name,
              ...(row.email ? { email: row.email } : {}),
              internalNotes: notes || null,
              tags: [...new Set([...current.tags, ...row.tags])].slice(0, 20),
            },
          });
          summary.updated++;
        }
      }
    },
    { timeout: 60_000, maxWait: 10_000 },
  );
  return summary;
}
