// /api/_lib/prisma.ts
import { PrismaClient } from "@prisma/client";

// Cache the client in dev to avoid many connections during hot reloads
declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

const prisma = global.__prisma__ ?? new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
});

if (process.env.NODE_ENV !== "production") global.__prisma__ = prisma;

export default prisma;
//dfd