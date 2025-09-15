// api/events/[id].ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Use GET" });
  }

  // Support Vercel dynamic route: { id: string | string[] }
  const idParam = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const idNum = Number(idParam);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    return res.status(400).json({ error: "Invalid id" });
  }

  try {
    const ev = await prisma.event.findUnique({
      where: { id: idNum },
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

    if (!ev) return res.status(404).json({ error: "Not found" });
    return res.status(200).json(ev);
  } catch (e: any) {
    console.error("GET /api/events/[id] error:", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
