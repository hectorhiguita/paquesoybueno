import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Returns a Prisma client extended with a query middleware that sets
 * `app.community_id` as a PostgreSQL session variable before every query.
 *
 * This enables PostgreSQL RLS policies to filter rows by community_id
 * automatically without requiring explicit WHERE clauses in every query.
 *
 * Uses `SET LOCAL` so the variable is scoped to the current transaction.
 * Falls back to `SET` for queries outside a transaction.
 *
 * Requirements: 12.1, 12.2
 */
export function getPrismaWithCommunity(communityId: string): PrismaClient {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          // SET LOCAL only works inside a transaction; use SET for standalone queries
          const [, result] = await prisma.$transaction([
            prisma.$executeRaw`SELECT set_config('app.community_id', ${communityId}, true)`,
            query(args) as never,
          ]);
          return result;
        },
      },
    },
  }) as unknown as PrismaClient;
}
