// api/_lib/prisma.ts
import { PrismaClient } from "@prisma/client";

// We export a function (not a pre-initialized client) so we can
// validate env/protocol and throw a *catchable* error in handlers.
declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

function makeClient() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "Missing DATABASE_URL. Set it in Vercel → Project → Settings → Environment Variables."
    );
  }

  // Hard-stop SQLite in production. Vercel serverless doesn't persist files.
  if (process.env.NODE_ENV === "production" && url.startsWith("file:")) {
    throw new Error(
      "SQLite (file:) cannot be used on Vercel serverless. Use a hosted Postgres/MySQL (e.g. Neon, Supabase, PlanetScale) and update DATABASE_URL."
    );
  }

  if (process.env.NODE_ENV === "production") {
    return new PrismaClient();
  }

  // Cache the client in dev to avoid "Too many connections".
  if (!global.__prisma__) {
    global.__prisma__ = new PrismaClient();
  }
  return global.__prisma__;
}

export function getPrisma(): PrismaClient {
  return makeClient();
}
