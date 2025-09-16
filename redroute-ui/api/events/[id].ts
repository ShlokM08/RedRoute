// /api/events/[id].ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma";

/* helpers */
const pickUser = (u: any) =>
  u
    ? {
        firstName: u.firstName ?? null,
        lastName: u.lastName ?? null,
        email: u.email ?? null,
      }
    : null;

const sanitizeRating = (n: any) => {
  const r = Number(n);
  if (!Number.isFinite(r)) return null;
  if (r < 1 || r > 5) return null;
  return Math.round(r);
};

// TODO: swap with your real auth
async function getUserFromHeaders(_req: VercelRequest) {
  return null as
    | null
    | {
        id: string; // string in your schema
        email: string;
        firstName?: string | null;
        lastName?: string | null;
      };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  const eventId = Number(id);
  if (!Number.isFinite(eventId) || eventId <= 0) {
    return res.status(400).json({ error: "Invalid id" });
  }

  try {
    if (req.method === "GET") {
      const [ev, reviews, agg] = await Promise.all([
        prisma.event.findUnique({
          where: { id: eventId },
          select: {
            id: true,
            name: true,
            description: true,
            location: true,
            startsAt: true,
            price: true,
            imageUrl: true,
            imageAlt: true,
          },
        }),
        prisma.eventReview.findMany({
          where: { eventId },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            rating: true,
            title: true,
            body: true,
            createdAt: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        }),
        prisma.eventReview.aggregate({
          _avg: { rating: true },
          _count: { _all: true },
          where: { eventId },
        }),
      ]);

      if (!ev) return res.status(404).json({ error: "Event not found" });

      return res.json({
        ...ev,
        reviews: reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          body: r.body,
          createdAt: r.createdAt,
          user: pickUser(r.user),
        })),
        reviewsAvg: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
        reviewsCount: agg._count._all ?? 0,
      });
    }

    if (req.method === "POST") {
      const me = await getUserFromHeaders(req);
      if (!me) return res.status(401).json({ error: "Please sign in to post a review" });

      const { rating, body } = (req.body ?? {}) as { rating?: number | string; body?: string };
      const safeRating = sanitizeRating(rating);
      if (!safeRating) return res.status(400).json({ error: "Rating must be an integer 1–5" });
      const safeBody = (body ?? "").toString().trim();
      if (!safeBody) return res.status(400).json({ error: "Review text is required" });

      const exists = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
      if (!exists) return res.status(404).json({ error: "Event not found" });

      // If you want 1 review per user per event (your schema enforces @@unique([eventId, userId]))
      // handle the unique error gracefully.
      try {
        await prisma.eventReview.create({
          data: {
            eventId,
            userId: me.id,
            rating: safeRating,
            body: safeBody,
          },
        });
      } catch (e: any) {
        // Prisma unique constraint code
        if (e?.code === "P2002") {
          return res.status(409).json({ error: "You’ve already reviewed this event." });
        }
        throw e;
      }

      const [ev, reviews, agg] = await Promise.all([
        prisma.event.findUnique({
          where: { id: eventId },
          select: {
            id: true,
            name: true,
            description: true,
            location: true,
            startsAt: true,
            price: true,
            imageUrl: true,
            imageAlt: true,
          },
        }),
        prisma.eventReview.findMany({
          where: { eventId },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            rating: true,
            title: true,
            body: true,
            createdAt: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        }),
        prisma.eventReview.aggregate({
          _avg: { rating: true },
          _count: { _all: true },
          where: { eventId },
        }),
      ]);

      return res.json({
        ...ev,
        reviews: reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          body: r.body,
          createdAt: r.createdAt,
          user: pickUser(r.user),
        })),
        reviewsAvg: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
        reviewsCount: agg._count._all ?? 0,
      });
    }

    return res.status(405).json({ error: "Use GET or POST" });
  } catch (e: any) {
    console.error("GET/POST /api/events/[id] error:", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
