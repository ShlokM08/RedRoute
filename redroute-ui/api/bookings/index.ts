// api/bookings/index.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js";

type Body = {
  hotelId?: number | string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  contactName?: string | null;
  contactEmail?: string | null;
};

function bad(res: VercelResponse, code: number, msg: string) {
  return res.status(code).json({ error: msg });
}

// Build a nice fallback display name if user has no first/last.
function fallbackNameFromEmail(email?: string | null) {
  if (!email) return null;
  const left = email.split("@")[0] || "";
  if (!left) return null;
  // title-case simple handles like "john.doe"
  return left
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map(w => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return bad(res, 405, "Use POST");
  }

  let body: Body;
  try {
    body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) ?? {};
  } catch {
    return bad(res, 400, "Invalid JSON body");
  }

  const { hotelId, checkIn, checkOut, guests = 1 } = body;

  // Basic validation
  const hotelIdNum = Number(hotelId);
  if (!hotelId || Number.isNaN(hotelIdNum)) {
    return bad(res, 400, "hotelId must be a number");
  }
  if (!checkIn || !checkOut) {
    return bad(res, 400, "checkIn and checkOut are required (ISO date strings)");
  }

  const ci = new Date(checkIn);
  const co = new Date(checkOut);
  if (Number.isNaN(+ci) || Number.isNaN(+co) || +co <= +ci) {
    return bad(res, 400, "Invalid date range");
  }

  try {
    // Ensure hotel exists + capacity
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelIdNum },
      select: { id: true, capacity: true, name: true },
    });
    if (!hotel) return bad(res, 404, "Hotel not found");

    const cap = typeof hotel.capacity === "number" ? hotel.capacity : 10;
    if (guests < 1 || guests > cap) {
      return bad(res, 400, `guests must be between 1 and ${cap}`);
    }

    // Check overlap for this hotel
    const overlap = await prisma.booking.findFirst({
      where: {
        hotelId: hotelIdNum,
        AND: [{ checkIn: { lt: co } }, { checkOut: { gt: ci } }],
      },
      select: { id: true },
    });
    if (overlap) {
      return bad(res, 409, "This date range is unavailable for the selected hotel.");
    }

    // Resolve user (from header x-user-id or x-user-email, which your client sets)
    const headerUserId =
      typeof req.headers["x-user-id"] === "string" ? req.headers["x-user-id"].trim() : null;
    const headerEmail =
      typeof req.headers["x-user-email"] === "string" ? req.headers["x-user-email"].trim() : null;

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

    // Fallback (shouldn't happen if auth is wired) – require some user
    if (!userId) {
      return bad(res, 401, "Not authenticated");
    }

    // Finalize contact fields: prefer body values, else derive from user
    const defaultName =
      (userFirst || userLast) ? [userFirst, userLast].filter(Boolean).join(" ").trim() : fallbackNameFromEmail(userEmail);
    const finalContactName = body.contactName ?? defaultName ?? null;
    const finalContactEmail = body.contactEmail ?? userEmail ?? null;

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        userId,
        hotelId: hotelIdNum,
        checkIn: ci,
        checkOut: co,
        guests,
        contactName: finalContactName,
        contactEmail: finalContactEmail,
      },
      select: {
        id: true,
        userId: true,
        hotelId: true,
        checkIn: true,
        checkOut: true,
        guests: true,
        contactName: true,
        contactEmail: true,
        createdAt: true,
      },
    });

    return res.status(201).json({ ok: true, booking });
  } catch (err: any) {
    const code = err?.code ? ` (code ${err.code})` : "";
    console.error("Create booking error:", err);
    return bad(res, 500, `Server error${code}`);
  }
}
