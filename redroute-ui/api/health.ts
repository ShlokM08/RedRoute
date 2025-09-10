import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "./_lib/prisma";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing");
    const count = await prisma.user.count();
    res.status(200).json({
      ok: true,
      db: "connected",
      userCount: count,
      env: process.env.NODE_ENV,
    });
  } catch (err: any) {
    console.error("HEALTH_ERROR", err);
    res.status(500).json({
      ok: false,
      db: "error",
      message: err?.message,
      code: err?.code,
      meta: err?.meta,
    });
  }
}
