// api/health.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "./_lib/prisma";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const hasDbUrl = Boolean(process.env.DATABASE_URL);
    const redactedUrl = hasDbUrl
      ? process.env.DATABASE_URL!.replace(/:\/\/[^:]+:([^@]+)@/, "://***:***@")
      : null;

    // Quick connectivity probe (cheaper than a big query)
    // If this throws, we capture the error detail below.
    await prisma.$queryRaw`SELECT 1`;

    // Simple query to prove client works
    const userCount = await prisma.user.count().catch(() => -1);

    res.status(200).json({
      ok: true,
      connected: true,
      userCount,
      env: process.env.NODE_ENV,
      dbUrlPresent: hasDbUrl,
      dbUrlRedacted: redactedUrl,
    });
  } catch (e: any) {
    // Log full error in Vercel function logs
    console.error("HEALTH DB ERROR:", e);

    // Return sanitized info to the client
    res.status(500).json({
      ok: false,
      connected: false,
      errorName: e?.name,
      errorCode: e?.code ?? e?.errorCode,
      message: e?.message,
      hint:
        "Check DATABASE_URL on Vercel and ensure it has ?sslmode=require for Render Postgres.",
    });
  }
}
