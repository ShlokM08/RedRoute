// api/health.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "./_lib/prisma";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    // Quick ping: ask Postgres version
    const ver = await prisma.$queryRawUnsafe<Array<{ version: string }>>("SELECT version()");
    const userCount = await prisma.user.count();

    res.status(200).json({
      ok: true,
      db: "connected",
      userCount,
      pgVersion: ver?.[0]?.version ?? null,
      region: process.env.VERCEL_REGION ?? "unknown",
      env: process.env.VERCEL_ENV ?? process.env.NODE_ENV
    });
  } catch (e: any) {
    // Surface the exact Prisma error in the response to debug 500s
    res.status(500).json({
      ok: false,
      error: e?.code || e?.name || "UNKNOWN",
      message: e?.message
    });
  }
}
