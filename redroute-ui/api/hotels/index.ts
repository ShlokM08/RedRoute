import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Use GET" });
  }

  try {
    const hotels = await prisma.hotel.findMany({
      include: { images: true },
      orderBy: { createdAt: "desc" },
    });

    // Make sure we always return JSON
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).json(hotels);
  } catch (e: any) {
    // This will show up in Vercel “Functions” logs
    console.error("GET /api/hotels failed:", e);
    return res.status(500).json({
      error: e?.message ?? "Server error",
      code: e?.code ?? null,
    });
  }
}
