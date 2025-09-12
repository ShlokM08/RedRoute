import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Use GET" });

  const { city } = req.query;

  try {
    const hotels = await prisma.hotel.findMany({
      where: city
        ? { city: { contains: String(city), mode: "insensitive" } }
        : {},
      include: { images: true },
    });
    return res.status(200).json(hotels);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
}
