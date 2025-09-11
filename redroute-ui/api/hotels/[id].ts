import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js"; // IMPORTANT: reuse the shared client

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const idParam = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!idParam) return res.status(400).json({ error: "Missing hotel id" });

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Use GET" });
  }

  try {
    // Same strategy: basic row + separate images
    const hotel = await prisma.hotel.findUnique({
      where: { id: idParam as string },
      select: { id: true, name: true, city: true, price: true, rating: true },
    });
    if (!hotel) return res.status(404).json({ error: "Hotel not found" });

    const images = await prisma.hotelImage.findMany({
      where: { hotelId: hotel.id },
      select: { id: true, hotelId: true, url: true, alt: true },
    });

    return res.status(200).json({ ...hotel, images });
  } catch (e: any) {
    return res.status(500).json({
      error: e?.message ?? "Server error",
      code: e?.code,
      meta: e?.meta,
    });
  }
}
