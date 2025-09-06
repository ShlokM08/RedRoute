import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    // optional ?userId=...
    const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
    try {
      const favs = await prisma.favorite.findMany({
        where: userId ? { userId } : undefined,
        include: { hotel: { include: { images: true } } },
        orderBy: { createdAt: "desc" },
      });
      return res.status(200).json(favs);
    } catch (e: any) {
      return res.status(500).json({ error: e.message ?? "Server error" });
    }
  }

  if (req.method === "POST") {
    const { hotelId, userId } = req.body || {};
    if (!hotelId) return res.status(400).json({ error: "hotelId required" });
    // Toggle favorite (for now, userId can be null)
    try {
      const existing = await prisma.favorite.findFirst({ where: { hotelId, userId: userId ?? null } });
      if (existing) {
        await prisma.favorite.delete({ where: { id: existing.id } });
        return res.status(200).json({ ok: true, removed: true });
      } else {
        const fav = await prisma.favorite.create({ data: { hotelId, userId: userId ?? null } });
        return res.status(201).json(fav);
      }
    } catch (e: any) {
      return res.status(500).json({ error: e.message ?? "Server error" });
    }
  }

  return res.status(405).json({ error: "Use GET or POST" });
}
