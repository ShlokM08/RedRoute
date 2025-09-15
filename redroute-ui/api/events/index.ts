// api/events/index.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js"; // keep .js for Vercel

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Cache-Control", "no-store");
    return res.status(405).json({ error: "Use GET" });
  }

  try {
    const events = await prisma.event.findMany({
      orderBy: { startsAt: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        location: true,
        startsAt: true,
        price: true,
        capacity: true,
        imageUrl: true,
        imageAlt: true,
      },
    });

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(events);
  } catch (err) {
    console.error("GET /api/events error:", err);
    res.setHeader("Cache-Control", "no-store");
    return res.status(500).json({ error: "Server error" });
  }
}
