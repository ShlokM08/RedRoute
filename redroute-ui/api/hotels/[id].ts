import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Use GET" });
  }

  const idParam = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const idNum = Number(idParam);

  if (!Number.isFinite(idNum) || idNum <= 0) {
    return res.status(400).json({ error: "Invalid id" });
  }

  try {
    const hotel = await prisma.hotel.findUnique({
      where: { id: idNum },
      select: {
        id: true,
        name: true,
        city: true,
        price: true,
        rating: true,
        capacity: true, // IMPORTANT for UI's "max guests"
        images: { select: { url: true, alt: true } },
      },
    });

    if (!hotel) return res.status(404).json({ error: "Not found" });
    return res.status(200).json(hotel);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
