// api/hotels/[id].ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js";

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel dynamic route param
  const idParam = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const hotelId = Number(idParam);
  if (!Number.isFinite(hotelId) || hotelId <= 0) {
    return res.status(400).json({ error: "Invalid id" });
  }

  try {
    if (req.method === "GET") {
      const [hotel, reviews, agg] = await Promise.all([
        prisma.hotel.findUnique({
          where: { id: hotelId },
          select: {
            id: true,
            name: true,
            city: true,
            price: true,
            rating: true,
            capacity: true,
            images: { select: { url: true, alt: true } },
          },
        }),
        prisma.hotelReview.findMany({
          where: { hotelId },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        }),
        prisma.hotelReview.aggregate({ where: { hotelId }, _avg: { rating: true }, _count: { _all: true } }),
      ]);

      if (!hotel) return res.status(404).json({ error: "Not found" });

      const reviewsAvg = agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null;
      const reviewsCount = agg._count._all ?? 0;

      return res.status(200).json({
        ...hotel,
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
      // create/update a review at the same endpoint
      const user = await getUserFromHeaders(req);
      if (!user) return res.status(401).json({ error: "Not authenticated" });

      const rating = sanitizeRating((req.body as any)?.rating);
      const title: string | null = ((req.body as any)?.title ?? null) || null;
      const body: string = (((req.body as any)?.body || "") as string).toString().trim();

      if (!rating) return res.status(400).json({ error: "Rating must be 1–5" });
      if (!body) return res.status(400).json({ error: "Review text required" });

      const review = await prisma.hotelReview.upsert({
        where: { hotelId_userId: { hotelId, userId: user.id } },
        update: { rating, title, body },
        create: { hotelId, userId: user.id, rating, title, body },
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      });

      // recompute & persist hotel.rating for list cards
      const agg = await prisma.hotelReview.aggregate({ where: { hotelId }, _avg: { rating: true }, _count: { _all: true } });
      const avg = agg._avg.rating ?? null;
      if (avg != null) {
        await prisma.hotel.update({ where: { id: hotelId }, data: { rating: Math.round(avg * 10) / 10 } });
      }

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
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
