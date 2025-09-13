// api/hotels/index.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma"; // <-- correct relative path, no .js

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Use GET" });
  }

  const city = (req.query.city as string | undefined)?.trim();

  try {
    const hotels = await prisma.hotel.findMany({
      where: city
        ? { city: { contains: city, mode: "insensitive" } }
        : undefined,
      include: { images: true },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(hotels);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
