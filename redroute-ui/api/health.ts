// api/health.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPrisma } from "./_lib/prisma";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const prisma = getPrisma();
    // Try a tiny query; if it fails, we'll catch and return details.
    const count = await prisma.user.count().catch(() => -1);

    res.status(200).json({
      ok: true,
      db: "ok",
      userCount: count,
      hasDbUrl: !!process.env.DATABASE_URL,
      dbUrlKind: process.env.DATABASE_URL?.startsWith("file:") ? "sqlite-file" : "remote",
      env: process.env.NODE_ENV,
    });
  } catch (e: any) {
    res.status(500).json({
      ok: false,
      error: e?.message || "Function failed",
      hasDbUrl: !!process.env.DATABASE_URL,
      dbUrlKind: process.env.DATABASE_URL?.startsWith("file:") ? "sqlite-file" : "remote",
      env: process.env.NODE_ENV,
    });
  }
}
