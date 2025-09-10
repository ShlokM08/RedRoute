import { PrismaClient } from "@prisma/client";

const g = globalThis as unknown as { prisma?: PrismaClient };

const prisma =
  g.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? [] : ["query", "error", "warn"],
  });

if (process.env.NODE_ENV !== "production") g.prisma = prisma;

export default prisma;
