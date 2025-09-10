// api/_lib/prisma.ts
import { PrismaClient } from "@prisma/client";

// Let TS know about our cached client on globalThis
declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

/**
 * In production (serverless cold starts) just create a client.
 * In dev/hot-reload keep a single instance on globalThis to avoid too many connections.
 */
const prisma =
  process.env.NODE_ENV === "production"
    ? new PrismaClient()
    : (globalThis.__prisma__ ?? (globalThis.__prisma__ = new PrismaClient()));

export default prisma;
