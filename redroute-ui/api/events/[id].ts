// api/events/[id].ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma";

/* helpers */
const pickUser = (u: any) =>
  u ? { firstName: u.firstName ?? null, lastName: u.lastName ?? null, email: u.email ?? null } : null;

const sanitizeRating = (n: any) => {
  const r = Number(n);
  if (!Number.isFinite(r)) return null;
  if (r < 1 || r > 5) return null;
  return Math.round(r);
};

async function getUserFromHeaders(req: VercelRequest) {
  const id = ((req.headers["x-user-id"] as string) || "").trim();
  const email = ((req.headers["x-user-email"] as string) || "").trim();

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

function getId(req: VercelRequest) {
  const idParam = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const id = Number(idParam);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function json(res: VercelResponse, code: number, data: any) {
  res.status(code).setHeader("content-type", "application/json; charset=utf-8");
  return res.send(JSON.stringify(data));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Preflight / HEAD
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS,HEAD");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,x-user-id,x-user-email");
    return res.status(204).end();
  }
  if (req.method === "HEAD") {
    return res.status(200).end();
  }

  const eventId = getId(req);
  if (!eventId) return json(res, 400, { error: "Invalid id" });

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
        prisma.eventReview.aggregate({
          where: { eventId },
          _avg: { rating: true },
          _count: { _all: true },
        }),
      ]);

      if (!ev) return json(res, 404, { error: "Not found" });

      const reviewsAvg = agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null;
      const reviewsCount = agg._count._all ?? 0;

      return json(res, 200, {
        ...ev,
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
      if (!user) return json(res, 401, { error: "Not authenticated" });

      const rating = sanitizeRating((req.body as any)?.rating);
      const title: string | null = ((req.body as any)?.title ?? null) || null;
      const body: string = (((req.body as any)?.body || "") as string).toString().trim();

      if (!rating) return json(res, 400, { error: "Rating must be 1–5" });
      if (!body) return json(res, 400, { error: "Review text required" });

      const review = await prisma.eventReview.upsert({
        where: { eventId_userId: { eventId, userId: user.id } },
        update: { rating, title, body },
        create: { eventId, userId: user.id, rating, title, body },
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      });

      const agg = await prisma.eventReview.aggregate({
        where: { eventId },
        _avg: { rating: true },
        _count: { _all: true },
      });

      return json(res, 200, {
        review: {
          id: review.id,
          userId: review.userId,
          rating: review.rating,
          title: review.title,
          body: review.body,
          createdAt: review.createdAt,
          user: pickUser(review.user),
        },
        reviewsAvg: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
        reviewsCount: agg._count._all ?? 0,
      });
    }

    return json(res, 405, { error: "Use GET or POST" });
  } catch (e: any) {
    console.error("API /api/events/[id] error:", e);
    return json(res, 500, { error: e?.message || "Server error" });
  }
}
