import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../_lib/prisma";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Use GET" });

  try {
    const hotels = await prisma.hotel.findMany({
      include: { images: true },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json(hotels);
  } catch (e: any) {
    // This will show up in your Vercel “Functions” logs
    console.error("GET /api/hotels failed", {
      message: e?.message,
      code: e?.code,
      meta: e?.meta,
      stack: e?.stack,
    });

    // Helpful status & hint for common Prisma DB error
    const status = e?.code === "P1001" ? 503 : 500;
    return res.status(status).json({
      error: e?.message || "Server error",
      code: e?.code || "ERR",
      hint:
        e?.code === "P1001"
          ? "Cannot reach database. Check DATABASE_URL on Vercel."
          : undefined,
    });
  }
}
