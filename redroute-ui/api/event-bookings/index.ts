// api/event-bookings/index.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js";

function bad(res: VercelResponse, code: number, msg: string) {
  return res
    .status(code)
    .setHeader("content-type", "application/json; charset=utf-8")
    .json({ error: msg });
}

type Body = {
  eventId?: number | string;
  qty?: number;
  contactName?: string | null;
  contactEmail?: string | null;
};

function fallbackNameFromEmail(email?: string | null) {
  if (!email) return null;
  const left = email.split("@")[0] || "";
  if (!left) return null;
  return left
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => (w[0] ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") return bad(res, 405, "Use POST");

    let body: Body;
    try {
      body =
        (typeof req.body === "string" ? JSON.parse(req.body) : req.body) ?? {};
    } catch {
      return bad(res, 400, "Invalid JSON body");
    }

    const eventIdNum = Number(body.eventId);
    if (!eventIdNum || Number.isNaN(eventIdNum))
      return bad(res, 400, "eventId must be a number");

    const qty = Math.max(1, Math.floor(Number(body.qty ?? 1)));
    if (!qty || Number.isNaN(qty)) return bad(res, 400, "qty must be >= 1");

    // Identify user (exactly like your hotel booking handler)
    const headerUserId =
      typeof req.headers["x-user-id"] === "string"
        ? req.headers["x-user-id"].trim()
        : null;
    const headerEmail =
      typeof req.headers["x-user-email"] === "string"
        ? req.headers["x-user-email"].trim()
        : null;

    let userId: string | null = null;
    let userEmail: string | null = headerEmail ?? null;
    let userFirst: string | null = null;
    let userLast: string | null = null;

    if (headerUserId) {
      const u = await prisma.user.findUnique({
        where: { id: headerUserId },
        select: { id: true, email: true, firstName: true, lastName: true },
      });
      if (u) {
        userId = u.id;
        userEmail = u.email ?? userEmail;
        userFirst = u.firstName ?? null;
        userLast = u.lastName ?? null;
      }
    }
    if (!userId) return bad(res, 401, "Not authenticated");

    // Load event
    const ev = await prisma.event.findUnique({
      where: { id: eventIdNum },
      select: {
        id: true,
        name: true,
        price: true,
        capacity: true,
      },
    });
    if (!ev) return bad(res, 404, "Event not found");

    // Capacity check: sum already booked seats
    const agg = await prisma.eventBooking.aggregate({
      where: { eventId: ev.id },
      _sum: { qty: true },
    });
    const already = agg._sum.qty ?? 0;
    const remaining = Math.max(0, (ev.capacity ?? 0) - already);
    if (ev.capacity != null && qty > remaining) {
      return bad(
        res,
        409,
        `Only ${remaining} seat(s) remaining for this event`
      );
    }

    // Derive contact fields if not sent
    const guessedName =
      userFirst || userLast
        ? [userFirst, userLast].filter(Boolean).join(" ").trim()
        : fallbackNameFromEmail(userEmail);
    const contactName = body.contactName ?? guessedName ?? null;
    const contactEmail = body.contactEmail ?? userEmail ?? null;

    // Compute total (server-side truth)
    const totalCost = (ev.price || 0) * qty;

    const booking = await prisma.eventBooking.create({
      data: {
        userId,
        eventId: ev.id,
        qty,
        totalCost,
        contactName,
        contactEmail,
      },
      select: {
        id: true,
        userId: true,
        eventId: true,
        qty: true,
        totalCost: true,
        contactName: true,
        contactEmail: true,
        createdAt: true,
      },
    });

    return res
      .status(201)
      .setHeader("content-type", "application/json; charset=utf-8")
      .json({ ok: true, booking });
  } catch (err: any) {
    console.error("POST /api/event-bookings error:", err);
    const code = err?.code ? ` (code ${err.code})` : "";
    return bad(res, 500, `Server error${code}`);
  }
}
