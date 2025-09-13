// api/_lib/prisma.ts
import { PrismaClient } from "@prisma/client";

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

// Reuse the Prisma Client in development to avoid too many connections
const prisma = global.__prisma__ ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma__ = prisma;
}

export default prisma;
