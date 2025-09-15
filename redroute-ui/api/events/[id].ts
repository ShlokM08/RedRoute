// api/events/[id].ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Use GET" });
  }

  const id = Number(req.query.id);
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  try {
    const ev = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true, name: true, description: true, location: true,
        startsAt: true, price: true, capacity: true,
        imageUrl: true, imageAlt: true,
      },
    });
    if (!ev) return res.status(404).json({ error: "Event not found" });

    const agg = await prisma.eventBooking.aggregate({
      where: { eventId: id },
      _sum: { qty: true },
    });
    const taken = agg._sum.qty ?? 0;
    const seatsLeft = Math.max(0, ev.capacity - taken);

    return res.status(200).json({ ...ev, seatsLeft });
  } catch (err: any) {
    console.error("GET /api/events/[id] error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
