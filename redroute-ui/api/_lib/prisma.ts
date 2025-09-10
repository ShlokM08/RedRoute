// api/_lib/prisma.ts
import { PrismaClient } from "@prisma/client";

/**
 * Singleton PrismaClient:
 * - In production (serverless cold starts), just create a new client.
 * - In dev (hot reload), reuse across HMR to avoid too many connections.
 */
declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

const prisma =
  process.env.NODE_ENV === "production"
    ? new PrismaClient()
    : (globalThis.__prisma__ ?? (globalThis.__prisma__ = new PrismaClient()));

export default prisma;
