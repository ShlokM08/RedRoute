import { prisma } from "./_lib/prisma.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return res.status(405).end();
    const hotels = await prisma.hotel.findMany({
      include: { images: true },
      orderBy: { createdAt: "desc" }
    });
    res.status(200).json(hotels);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}
