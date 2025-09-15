// api/events/index.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js"; // keep .js for Vercel

function bad(res: VercelResponse, code: number, msg: string) {
  return res
    .status(code)
    .setHeader("content-type", "application/json; charset=utf-8")
    .json({ error: msg });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") return bad(res, 405, "Use GET");

    // optional: simple search & pagination
    const q = String(req.query.q ?? "").trim().toLowerCase();
    const take = Math.min(50, Math.max(1, Number(req.query.take ?? 20)));

    const events = await prisma.event.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { location: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: [{ startsAt: "asc" }, { id: "asc" }],
      take,
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
      },
    });

    return res
      .status(200)
      .setHeader("content-type", "application/json; charset=utf-8")
      .json(events);
  } catch (err: any) {
    console.error("GET /api/events error:", err);
    return bad(res, 500, "Server error");
  }
}
