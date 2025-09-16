// server/routes/reviews.ts
import { Router } from "express";
import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/server/db.js";
import { getUserIdFromRequest } from "../../lib/server/auth.js";

export const reviewsRouter = Router();

/* ---------------- helpers ---------------- */
function sendError(res: Response, code: number, error: string) {
  return res.status(code).json({ error });
}

async function getUserFromReq(req: Request) {
  // 1) Prefer session (cookie-based)
  const bySession = getUserIdFromRequest(req);
  if (bySession) {
    const u = await prisma.user.findUnique({ where: { id: bySession } });
    if (u) return u;
  }
  // 2) Fallback: id/email headers (for local tools)
  const userId = (req.header("x-user-id") || "").trim();
  const email = (req.header("x-user-email") || "").trim();
  if (userId) {
    const u = await prisma.user.findUnique({ where: { id: userId } });
    if (u) return u;
  }
  if (email) {
    const u = await prisma.user.findUnique({ where: { email } });
    if (u) return u;
  }
  return null;
}

function sanitizeRating(n: unknown) {
  const r = Number(n);
  if (!Number.isFinite(r)) return null;
  if (r < 1 || r > 5) return null;
  return Math.round(r); // 1..5 int
}

function pickUserPublic(u: any) {
  return u
    ? { firstName: u.firstName ?? null, lastName: u.lastName ?? null, email: u.email ?? null }
    : null;
}

/* --------------- GET /api/hotels/:id/reviews --------------- */
reviewsRouter.get("/api/hotels/:id/reviews", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return sendError(res, 400, "Invalid hotel id");

  try {
    const rows = await prisma.hotelReview.findMany({
      where: { hotelId: id },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });

    const out = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      rating: r.rating,
      title: r.title,
      body: r.body,
      createdAt: r.createdAt,
      user: pickUserPublic(r.user),
    }));

    return res.json(out); // array
  } catch {
    return sendError(res, 500, "Failed to load reviews");
  }
});

/* --------------- POST /api/hotels/:id/reviews --------------- */
reviewsRouter.post("/api/hotels/:id/reviews", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return sendError(res, 400, "Invalid hotel id");

  const user = await getUserFromReq(req);
  if (!user) return sendError(res, 401, "Not authenticated");

  const rating = sanitizeRating((req.body as any)?.rating);
  const title: string | null = ((req.body as any)?.title ?? null) || null;
  const body: string = ((req.body as any)?.body || "").toString().trim();

  if (!rating) return sendError(res, 400, "Rating must be 1–5");
  if (!body) return sendError(res, 400, "Review text required");

  try {
    // Upsert on unique (hotelId, userId)
    const review = await prisma.hotelReview.upsert({
      where: { hotelId_userId: { hotelId: id, userId: user.id } },
      update: { rating, title, body },
      create: { hotelId: id, userId: user.id, rating, title, body },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });

    // Recompute average rating for the hotel and persist (one decimal)
    const agg = await prisma.hotelReview.aggregate({
      where: { hotelId: id },
      _avg: { rating: true },
    });
    const avg = agg._avg.rating ?? null;
    if (avg != null) {
      await prisma.hotel.update({
        where: { id },
        data: { rating: Math.round(avg * 10) / 10 },
      });
    }

    return res.json({
      review: {
        id: review.id,
        userId: review.userId,
        rating: review.rating,
        title: review.title,
        body: review.body,
        createdAt: review.createdAt,
        user: pickUserPublic(review.user),
      },
    });
  } catch (e: any) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      return sendError(res, 400, e.message);
    }
    return sendError(res, 500, "Could not save review");
  }
});

/* --------------- GET /api/events/:id/reviews --------------- */
reviewsRouter.get("/api/events/:id/reviews", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return sendError(res, 400, "Invalid event id");

  try {
    const rows = await prisma.eventReview.findMany({
      where: { eventId: id },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });

    const out = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      rating: r.rating,
      title: r.title,
      body: r.body,
      createdAt: r.createdAt,
      user: pickUserPublic(r.user),
    }));

    return res.json(out); // array
  } catch {
    return sendError(res, 500, "Failed to load reviews");
  }
});

/* --------------- POST /api/events/:id/reviews --------------- */
reviewsRouter.post("/api/events/:id/reviews", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return sendError(res, 400, "Invalid event id");

  const user = await getUserFromReq(req);
  if (!user) return sendError(res, 401, "Not authenticated");

  const rating = sanitizeRating((req.body as any)?.rating);
  const title: string | null = ((req.body as any)?.title ?? null) || null;
  const body: string = ((req.body as any)?.body || "").toString().trim();

  if (!rating) return sendError(res, 400, "Rating must be 1–5");
  if (!body) return sendError(res, 400, "Review text required");

  try {
    const review = await prisma.eventReview.upsert({
      where: { eventId_userId: { eventId: id, userId: user.id } },
      update: { rating, title, body },
      create: { eventId: id, userId: user.id, rating, title, body },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });

    return res.json({
      review: {
        id: review.id,
        userId: review.userId,
        rating: review.rating,
        title: review.title,
        body: review.body,
        createdAt: review.createdAt,
        user: pickUserPublic(review.user),
      },
    });
  } catch (e: any) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      return sendError(res, 400, e.message);
    }
    return sendError(res, 500, "Could not save review");
  }
});

export default reviewsRouter;
