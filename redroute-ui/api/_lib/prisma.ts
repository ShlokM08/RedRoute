/// <reference types="node" />
// api/_lib/prisma.ts
import { PrismaClient } from "@prisma/client";

// Augment the globalThis type so TS knows about our singleton cache.
declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

/**
 * In production (serverless cold starts), just create a new client.
 * In dev / local (where modules can hot-reload), cache on globalThis
 * to avoid "Too many connections" from multiple PrismaClient instances.
 */
const prisma =
  process.env.NODE_ENV === "production"
    ? new PrismaClient()
    : (globalThis.__prisma__ ?? (globalThis.__prisma__ = new PrismaClient()));

export default prisma;
