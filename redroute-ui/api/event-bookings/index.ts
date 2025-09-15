// api/event-bookings/index.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js";

/** Tiny cookie parser so we can fall back if headers missing */
function cookieGet(req: VercelRequest, key: string): string | null {
  const raw = req.headers.cookie || "";
  const parts = raw.split(/;\s*/g);
  for (const p of parts) {
    const [k, ...rest] = p.split("=");
    if (!k) continue;
    if (decodeURIComponent(k.trim()) === key) {
      return decodeURIComponent((rest.join("=") || "").trim());
    }
  }
  return null;
}

function bad(res: VercelResponse, code: number, msg: string) {
  return res.status(code).json({ error: msg });
}

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
  if (req.method !== "POST") return bad(res, 405, "Use POST");

  // -------- Parse JSON body safely
  let body: any = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body ?? {});
  } catch {
    return bad(res, 400, "Invalid JSON body");
  }

  const eventId = Number(body.eventId);
  const qty = Math.max(1, Number(body.qty ?? 1));

  if (!Number.isFinite(eventId) || eventId <= 0) return bad(res, 400, "eventId must be a positive number");
  if (!Number.isFinite(qty)) return bad(res, 400, "qty must be a number");

  // -------- Identify the user (headers first, cookies as fallback)
  const headerUid = typeof req.headers["x-user-id"] === "string" ? req.headers["x-user-id"].trim() : null;
  const headerEmail = typeof req.headers["x-user-email"] === "string" ? req.headers["x-user-email"].trim() : null;

  const cookieUid = cookieGet(req, "uid");
  const cookieEmail = cookieGet(req, "email");

  const userId = headerUid || cookieUid;
  const email = headerEmail || cookieEmail;

  if (!userId) return bad(res, 401, "Not authenticated");

  try {
    // -------- Fetch event + price/capacity
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true, price: true, capacity: true, startsAt: true },
    });
    if (!event) return bad(res, 404, "Event not found");

    // -------- Capacity check (sum of existing qty)
    const agg = await prisma.eventBooking.aggregate({
      where: { eventId },
      _sum: { qty: true },
    });
    const already = agg._sum.qty ?? 0;
    const remaining = Math.max(0, event.capacity - already);
    if (qty > remaining) {
      return bad(res, 409, `Only ${remaining} seats left for this event`);
    }

    const totalCost = event.price * qty;

    // -------- Try to load user to snapshot contact info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true },
    });

    const contactEmail = user?.email ?? email ?? null;
    const contactName =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
      fallbackNameFromEmail(contactEmail);

    // -------- Create booking in a short transaction (minimal race window)
    const booking = await prisma.$transaction(async (tx) => {
      // Re-check capacity right before insert (optional but safer)
      const agg2 = await tx.eventBooking.aggregate({
        where: { eventId },
        _sum: { qty: true },
      });
      const already2 = agg2._sum.qty ?? 0;
      const remaining2 = Math.max(0, event.capacity - already2);
      if (qty > remaining2) {
        throw new Error(`Only ${remaining2} seats left for this event`);
      }

      return tx.eventBooking.create({
        data: {
          userId,
          eventId,
          qty,
          totalCost,
          contactEmail,
          contactName,
        },
        select: {
          id: true,
          eventId: true,
          userId: true,
          qty: true,
          totalCost: true,
          contactEmail: true,
          contactName: true,
          createdAt: true,
        },
      });
    });

    return res.status(201).json({ ok: true, booking });
  } catch (err: any) {
    const msg = err?.message || "Server error";
    // If it was our re-check error, surface as 409
    if (/seats left/.test(msg)) return bad(res, 409, msg);
    console.error("event-bookings error:", err);
    return bad(res, 500, "Server error");
  }
}
