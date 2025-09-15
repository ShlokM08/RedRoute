// api/event-bookings/index.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js";

function bad(res: VercelResponse, code: number, msg: string) {
  return res.status(code).json({ error: msg });
}

function parseCookies(req: VercelRequest): Record<string, string> {
  const out: Record<string, string> = {};
  const raw = req.headers.cookie || "";
  raw.split(";").forEach((p) => {
    const [k, ...rest] = p.split("=");
    if (!k || !rest.length) return;
    out[decodeURIComponent(k.trim())] = decodeURIComponent(rest.join("=").trim());
  });
  return out;
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

  const { eventId, qty, contactName, contactEmail } = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) ?? {};

  const eventIdNum = Number(eventId);
  const qtyNum = Number(qty ?? 1);

  if (!eventId || Number.isNaN(eventIdNum)) return bad(res, 400, "eventId must be a number");
  if (!qtyNum || qtyNum < 1 || qtyNum > 20) return bad(res, 400, "qty must be between 1 and 20");

  try {
    // Identify the user (headers OR cookies set by your app)
    const cookies = parseCookies(req);
    const headerUserId = typeof req.headers["x-user-id"] === "string" ? req.headers["x-user-id"].trim() : null;
    const headerEmail  = typeof req.headers["x-user-email"] === "string" ? req.headers["x-user-email"].trim() : null;

    const cookieUid = cookies["uid"] || cookies["userId"] || cookies["user_id"] || null;
    const cookieEmail = cookies["email"] || cookies["user_email"] || null;

    let userId: string | null = headerUserId || cookieUid || null;
    let userEmail: string | null = headerEmail || cookieEmail || null;
    let userFirst: string | null = null;
    let userLast: string | null = null;

    if (userId) {
      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, firstName: true, lastName: true },
      });
      if (u) {
        userId = u.id;
        userEmail = u.email ?? userEmail;
        userFirst = u.firstName ?? null;
        userLast = u.lastName ?? null;
      } else {
        userId = null; // fall through to 401
      }
    }
    if (!userId) return bad(res, 401, "Not authenticated");

    // Load the event
    const ev = await prisma.event.findUnique({
      where: { id: eventIdNum },
      select: { id: true, name: true, price: true, capacity: true, startsAt: true },
    });
    if (!ev) return bad(res, 404, "Event not found");

    // Deny past events
    if (new Date(ev.startsAt).getTime() < Date.now()) {
      return bad(res, 400, "Event already started/finished");
    }

    // Check seats left
    const agg = await prisma.eventBooking.aggregate({
      where: { eventId: eventIdNum },
      _sum: { qty: true },
    });
    const taken = agg._sum.qty ?? 0;
    const left = ev.capacity - taken;
    if (left <= 0 || qtyNum > left) {
      return bad(res, 409, `Only ${Math.max(0, left)} seats left`);
    }

    // Contact defaults
    const defaultName =
      (userFirst || userLast)
        ? [userFirst, userLast].filter(Boolean).join(" ").trim()
        : fallbackNameFromEmail(userEmail);

    const finalContactName = contactName ?? defaultName ?? null;
    const finalContactEmail = contactEmail ?? userEmail ?? null;

    // Compute total server-side
    const totalCost = ev.price * qtyNum;

    // Create booking
    const booking = await prisma.eventBooking.create({
      data: {
        userId: userId!,
        eventId: eventIdNum,
        qty: qtyNum,
        totalCost,
        contactName: finalContactName,
        contactEmail: finalContactEmail,
      },
      select: {
        id: true, userId: true, eventId: true, qty: true, totalCost: true,
        contactName: true, contactEmail: true, createdAt: true,
      },
    });

    return res.status(201).json({ ok: true, booking });
  } catch (err: any) {
    const code = err?.code ? ` (code ${err.code})` : "";
    console.error("POST /api/event-bookings error:", err);
    return bad(res, 500, `Server error${code}`);
  }
}
