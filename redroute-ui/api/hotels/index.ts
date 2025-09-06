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
    return res.status(200).json(hotels);
  } catch (e: any) {
    console.error("GET /api/hotels failed:", e);
    return res.status(500).json({ error: String(e?.message ?? e) });
  }
}
//empty commi