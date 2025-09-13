import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Use GET" });
  }
  try {
    const idParam = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
    const id = Number(idParam);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid hotel id" });

    const hotel = await prisma.hotel.findUnique({
      where: { id },
      include: { images: true },
    });
    if (!hotel) return res.status(404).json({ error: "Hotel not found" });
    return res.status(200).json(hotel);
  } catch (e: any) {
    console.error("GET /api/hotels/[id] error:", e);
    return res.status(500).json({ error: "Server error" });
  }
}
