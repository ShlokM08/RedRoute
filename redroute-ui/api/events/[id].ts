// api/events/[id].ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Use GET" });

  const raw = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const id = Number(raw);
  if (!raw || Number.isNaN(id)) return res.status(400).json({ error: "id must be a number" });

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
    if (!ev) return res.status(404).json({ error: "Event not found" });
    return res.status(200).json(ev);
  } catch (err) {
    console.error("events [id] error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
