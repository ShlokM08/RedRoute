import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

export function getPrisma() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    const err = new Error("Missing env.DATABASE_URL in serverless function");
    (err as any).code = "NO_DATABASE_URL";
    throw err;
  }

  if (global.__prisma__) return global.__prisma__;

  const client = new PrismaClient({
    log: ["error", "warn"],
    datasources: { db: { url } },
  });

  if (process.env.NODE_ENV !== "production") global.__prisma__ = client;
  return client;
}
