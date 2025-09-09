// api/health.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "./_lib/prisma";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const count = await prisma.user.count();
    res.status(200).json({
      ok: true,
      db: "connected",
      userCount: count,
      env: process.env.NODE_ENV,
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, db: "error", error: e?.message || "DB error" });
  }
}
