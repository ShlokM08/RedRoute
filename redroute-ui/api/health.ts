import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPrisma } from "./_lib/prisma";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const prisma = getPrisma();
    const count = await prisma.user.count();
    res.status(200).json({
      ok: true,
      db: "connected",
      userCount: count,
      regionHint: process.env.VERCEL_REGION || "unknown",
    });
  } catch (e: any) {
    console.error("HEALTH ERROR:", e);
    res.status(500).json({
      ok: false,
      db: "error",
      error: e?.code || e?.message || "unknown",
      env: {
        DATABASE_URL_present: !!process.env.DATABASE_URL,
        DIRECT_URL_present: !!process.env.DIRECT_URL,
      },
    });
  }
}
