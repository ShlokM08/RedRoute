import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

/** In prod, a single client; in dev, cache on global to avoid too many connections. */
const prisma =
  process.env.NODE_ENV === "production"
    ? new PrismaClient()
    : (globalThis.__prisma__ ?? (globalThis.__prisma__ = new PrismaClient()));

export default prisma;
