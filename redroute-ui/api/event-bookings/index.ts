// api/event-bookings/index.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js";

/** Parse cookies from request header */
function parseCookies(cookieHeader?: string | string[] | null): Record<string, string> {
  const out: Record<string, string> = {};
  const raw = Array.isArray(cookieHeader) ? cookieHeader.join("; ") : cookieHeader || "";
  raw.split(";").forEach((part) => {
    const i = part.indexOf("=");
    if (i > -1) {
      const k = decodeURIComponent(part.slice(0, i).trim());
      const v = decodeURIComponent(part.slice(i + 1).trim());
      if (k) out[k] = v;
    }
  });
  return out;
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
    .map(w => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

type Body = {
  eventId?: number | string;
  qty?: number;
  contactName?: string | null;
  contactEmail?: string | null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return bad(res, 405, "Use POST");

  let body: Body;
  try {
    body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) ?? {};
  } catch {
    return bad(res, 400, "Invalid JSON body");
  }

  const eventIdNum = Number(body.eventId);
  const qty = Number(body.qty ?? 1);

  if (!Number.isFinite(eventIdNum) || eventIdNum <= 0) {
    return bad(res, 400, "eventId must be a positive number");
  }
  if (!Number.isFinite(qty) || qty <= 0) {
    return bad(res, 400, "qty must be a positive number");
  }

  try {
    // --------- Identify user from headers OR cookies ----------
    const cookies = parseCookies(req.headers.cookie);
    const headerUserId =
      typeof req.headers["x-user-id"] === "string" ? req.headers["x-user-id"].trim() : null;
    const headerEmail =
      typeof req.headers["x-user-email"] === "string" ? req.headers["x-user-email"].trim() : null;

    const cookieUserId = cookies.uid || cookies.userId || cookies.user_id || null;
    const cookieEmail = cookies.email || cookies.user_email || null;

    const candidateUserId = headerUserId || cookieUserId;

    let userId: string | null = null;
    let userEmail: string | null = headerEmail || cookieEmail || null;
    let userFirst: string | null = null;
    let userLast: string | null = null;

    if (candidateUserId) {
      const u = await prisma.user.findUnique({
        where: { id: candidateUserId },
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

    // --------- Load event ----------
    const ev = await prisma.event.findUnique({
      where: { id: eventIdNum },
      select: { id: true, name: true, price: true, capacity: true, startsAt: true },
    });
    if (!ev) return bad(res, 404, "Event not found");

    // --------- Capacity check ----------
    const agg = await prisma.eventBooking.aggregate({
      where: { eventId: ev.id },
      _sum: { qty: true },
    });
    const already = agg._sum.qty ?? 0;
    const remaining = Math.max(0, ev.capacity - already);
    if (qty > remaining) {
      return bad(res, 409, `Only ${remaining} seats remaining for this event`);
    }

    // --------- Derive contact fields if needed ----------
    const defaultName =
      (userFirst || userLast)
        ? [userFirst, userLast].filter(Boolean).join(" ").trim()
        : fallbackNameFromEmail(userEmail);
    const finalContactName = body.contactName ?? defaultName ?? null;
    const finalContactEmail = body.contactEmail ?? userEmail ?? null;

    // --------- Compute total ----------
    const totalCost = ev.price * qty;

    // --------- Create booking ----------
    const booking = await prisma.eventBooking.create({
      data: {
        userId,
        eventId: ev.id,
        qty,
        totalCost,
        contactName: finalContactName,
        contactEmail: finalContactEmail,
      },
      select: {
        id: true,
        eventId: true,
        userId: true,
        qty: true,
        totalCost: true,
        contactName: true,
        contactEmail: true,
        createdAt: true,
      },
    });

    return res.status(201).json({ ok: true, booking });
  } catch (err: any) {
    console.error("Create event booking error:", err);
    const code = err?.code ? ` (code ${err.code})` : "";
    return bad(res, 500, `Server error${code}`);
  }
}
