// /api/events/[id].ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js";

/* helpers (mirrors /api/hotels/[id].ts) */
const pickUser = (u: any) =>
  u ? { firstName: u.firstName ?? null, lastName: u.lastName ?? null, email: u.email ?? null } : null;

const sanitizeRating = (n: any) => {
  const r = Number(n);
  if (!Number.isFinite(r)) return null;
  if (r < 1 || r > 5) return null;
  return Math.round(r);
};

async function getUserFromHeaders(req: VercelRequest) {
  const id = (req.headers["x-user-id"] as string | undefined)?.trim() || "";
  const email = (req.headers["x-user-email"] as string | undefined)?.trim() || "";

  if (id) {
    const u = await prisma.user.findUnique({ where: { id } });
    if (u) return u;
  }
  if (email) {
    const u = await prisma.user.findUnique({ where: { email } });
    if (u) return u;
  }
  return null;
}

// parse body safely (works if Vercel already parsed or if it's a string/undefined)
async function readJsonBody(req: VercelRequest): Promise<any> {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return await new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try { resolve(JSON.parse(raw || "{}")); } catch { resolve({}); }
    });
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const idParam = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const eventId = Number(idParam);
  if (!Number.isFinite(eventId) || eventId <= 0) {
    return res.status(400).json({ error: "Invalid id" });
  }

  try {
    if (req.method === "GET") {
      const [event, reviews, agg] = await Promise.all([
        prisma.event.findUnique({
          where: { id: eventId },
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
        }),
        prisma.eventReview.findMany({
          where: { eventId },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        }),
        prisma.eventReview.aggregate({ where: { eventId }, _avg: { rating: true }, _count: { _all: true } }),
      ]);

      if (!event) return res.status(404).json({ error: "Not found" });

      const reviewsAvg = agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null;
      const reviewsCount = agg._count._all ?? 0;

      return res.status(200).json({
        ...event,
        reviews: reviews.map((r) => ({
          id: r.id,
          userId: r.userId,
          rating: r.rating,
          title: r.title,
          body: r.body,
          createdAt: r.createdAt,
          user: pickUser(r.user),
        })),
        reviewsAvg,
        reviewsCount,
      });
    }

    if (req.method === "POST") {
      const user = await getUserFromHeaders(req);
      if (!user) return res.status(401).json({ error: "Not authenticated" });

      const body = await readJsonBody(req);
      const rating = sanitizeRating(body?.rating);
      const title: string | null = (body?.title ?? null) || null;
      const text: string = (body?.body || "").toString().trim();

      if (!rating) return res.status(400).json({ error: "Rating must be 1–5" });
      if (!text) return res.status(400).json({ error: "Review text required" });

      const review = await prisma.eventReview.upsert({
        where: { eventId_userId: { eventId, userId: user.id } }, // @@unique([eventId, userId]) in schema
        update: { rating, title, body: text },
        create: { eventId, userId: user.id, rating, title, body: text },
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      });

      // recompute aggregates and return
      const agg = await prisma.eventReview.aggregate({
        where: { eventId },
        _avg: { rating: true },
        _count: { _all: true },
      });
      const avg = agg._avg.rating ?? null;

      return res.status(200).json({
        review: {
          id: review.id,
          userId: review.userId,
          rating: review.rating,
          title: review.title,
          body: review.body,
          createdAt: review.createdAt,
          user: pickUser(review.user),
        },
        reviewsAvg: avg != null ? Math.round(avg * 10) / 10 : null,
        reviewsCount: agg._count._all ?? 0,
      });
    }

    return res.status(405).json({ error: "Use GET or POST" });
  } catch (e: any) {
    console.error("GET/POST /api/events/[id] error:", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
