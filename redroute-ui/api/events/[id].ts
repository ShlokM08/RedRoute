// api/events/[id].ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js";

function bad(res: VercelResponse, code: number, msg: string) {
  return res
    .status(code)
    .setHeader("content-type", "application/json; charset=utf-8")
    .json({ error: msg });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") return bad(res, 405, "Use GET");

    const idRaw = (req.query.id ?? "").toString();
    const id = Number(idRaw);
    if (!id || Number.isNaN(id)) return bad(res, 400, "Invalid id");

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
        createdAt: true,
        // If you later add images table for events, include it here.
      },
    });

    if (!ev) return bad(res, 404, "Event not found");

    return res
      .status(200)
      .setHeader("content-type", "application/json; charset=utf-8")
      .json(ev);
  } catch (err: any) {
    console.error("GET /api/events/[id] error:", err);
    return bad(res, 500, "Server error");
  }
}
