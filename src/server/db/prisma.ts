import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

import { withExplicitSslMode } from "./connection-string";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Driver adapter (`engineType = "client"` no schema): conexão pelo `pg`, sem binário nativo.
export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter: new PrismaPg({ connectionString: withExplicitSslMode(process.env.DATABASE_URL) }) });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
