import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /api/hotels/[id]
 * Returns a single hotel by id (String cuid), with images.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const idParam = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!idParam) return res.status(400).json({ error: "Missing hotel id" });

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Use GET" });
  }

  try {
    const hotel = await prisma.hotel.findUnique({
      where: { id: idParam as string }, // id is String in your Prisma schema
      include: { images: true },
    });
    if (!hotel) return res.status(404).json({ error: "Hotel not found" });
    return res.status(200).json(hotel);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
}
