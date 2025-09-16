// api/_lib/prisma.ts
import { PrismaClient } from "@prisma/client";

/**
 * Reuse a single PrismaClient in dev to avoid exhausting DB connections.
 */
const globalForPrisma = globalThis as unknown as {
  __prisma?: PrismaClient;
};

// Create or reuse the client
export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    // Optional: quieter logs in prod
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });

// Cache on global in dev
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prisma = prisma;
}

// Export default *and* named so both import styles work
export default prisma;
