// api/health.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "./_lib/prisma.js";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    // cheap check the DB is reachable
    await prisma.$queryRaw`SELECT 1`;

    const count = await prisma.user.count().catch(() => -1);
    res.status(200).json({
      ok: true,
      db: "connected",
      userCount: count,
      env: process.env.NODE_ENV,
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message ?? String(e) });
  }
}
