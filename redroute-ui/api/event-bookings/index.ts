// api/event-bookings/index.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js";

type Body = {
  eventId?: number | string;
  qty?: number;
  contactName?: string | null;
  contactEmail?: string | null;
};

function bad(res: VercelResponse, code: number, msg: string) {
  return res.status(code).json({ error: msg });
}

function parseCookie(req: VercelRequest, name: string): string | null {
  const raw = req.headers.cookie || "";
  const found = raw.split(";").map(s => s.trim()).find(kv => kv.startsWith(name + "="));
  return found ? decodeURIComponent(found.split("=")[1] || "") : null;
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return bad(res, 405, "Use POST");

  let body: Body = {};
  try {
    body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) ?? {};
  } catch {
    return bad(res, 400, "Invalid JSON body");
  }

  const eventId = Number(body.eventId);
  const qty = Number(body.qty ?? 1);
  if (!eventId || Number.isNaN(eventId)) return bad(res, 400, "eventId must be a number");
  if (qty < 1) return bad(res, 400, "qty must be >= 1");

  // Identify user (like hotel bookings)
  const headerUserId =
    typeof req.headers["x-user-id"] === "string" ? req.headers["x-user-id"].trim() : null;
  const headerEmail =
    typeof req.headers["x-user-email"] === "string" ? req.headers["x-user-email"].trim() : null;

  const cookieUid = parseCookie(req, "uid");
  const cookieEmail = parseCookie(req, "email");

  const userIdHeaderOrCookie = headerUserId || cookieUid || null;
  let userId: string | null = null;
  let userEmail: string | null = headerEmail || cookieEmail || null;
  let userFirst: string | null = null;
  let userLast: string | null = null;

  if (userIdHeaderOrCookie) {
    const u = await prisma.user.findUnique({
      where: { id: userIdHeaderOrCookie },
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

  try {
    // Load event
    const ev = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, price: true, capacity: true, name: true, startsAt: true },
    });
    if (!ev) return bad(res, 404, "Event not found");

    if (qty > ev.capacity) return bad(res, 400, `qty must be <= ${ev.capacity}`);

    const totalCost = ev.price * qty;

    const defaultName =
      (userFirst || userLast)
        ? [userFirst, userLast].filter(Boolean).join(" ").trim()
        : fallbackNameFromEmail(userEmail);

    const finalContactName = body.contactName ?? defaultName ?? null;
    const finalContactEmail = body.contactEmail ?? userEmail ?? null;

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
        userId: true,
        eventId: true,
        qty: true,
        totalCost: true,
        contactName: true,
        contactEmail: true,
        createdAt: true,
      },
    });

    return res.status(201).json({ ok: true, booking });
  } catch (err: any) {
    const code = err?.code ? ` (code ${err.code})` : "";
    console.error("Create event booking error:", err);
    return bad(res, 500, `Server error${code}`);
  }
}
