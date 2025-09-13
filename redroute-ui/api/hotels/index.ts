import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js"; // NOTE: .js extension is required

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Use GET" });
  }

  try {
    const city = String(req.query.city ?? "").trim();
    const where = city
      ? { city: { contains: city, mode: "insensitive" as const } }
      : {};

    const hotels = await prisma.hotel.findMany({
      where,
      include: { images: true },
      orderBy: { id: "asc" },
    });

    return res.status(200).json(hotels);
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}
