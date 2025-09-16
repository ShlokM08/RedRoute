// /api/events/[id].ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js";

function bad(res: VercelResponse, code: number, msg: string) {
  return res.status(code).json({ error: msg });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return bad(res, 405, "Use GET");

  // Debug the DB being used (compare with other routes)
  console.log("[events/:id] DB:", (process.env.DATABASE_URL || "").slice(0, 48));

  const idRaw = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const id = parseInt(String(idRaw ?? ""), 10);
  if (!Number.isInteger(id) || id <= 0) return bad(res, 400, "Invalid id");

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

    if (!ev) return bad(res, 404, "Event not found");
    return res.status(200).json(ev);
  } catch (e: any) {
    console.error("GET /api/events/[id] error:", e);
    return bad(res, 500, e?.message || "Server error");
  }
}
