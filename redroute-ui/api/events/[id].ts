// api/events/[id].ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js"; // keep .js for Vercel

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Cache-Control", "no-store");
    return res.status(405).json({ error: "Use GET" });
  }

  const raw = (req.query as any)?.id;
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isFinite(id) || id <= 0) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(400).json({ error: "Invalid id" });
  }

  try {
    const ev = await prisma.event.findUnique({
      where: { id },
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

    if (!ev) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(404).json({ error: "Event not found" });
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(ev);
  } catch (err) {
    console.error("GET /api/events/[id] error:", err);
    res.setHeader("Cache-Control", "no-store");
    return res.status(500).json({ error: "Server error" });
  }
}
