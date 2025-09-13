import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Use GET" });
  }

  try {
    const raw = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
    const idNum = Number(raw);
    if (!Number.isFinite(idNum)) return res.status(404).json({ error: "Not found" });

    const hotel = await prisma.hotel.findUnique({
      where: { id: idNum },
      include: { images: true },
    });

    if (!hotel) return res.status(404).json({ error: "Not found" });
    return res.status(200).json(hotel);
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}
