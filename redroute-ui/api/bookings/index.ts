// api/bookings/index.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js"; // keep .js for Vercel

type Body = {
  hotelId?: number | string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  contactName?: string | null;
  contactEmail?: string | null;
};

// ---------- tiny helpers ----------
function bad(res: VercelResponse, code: number, msg: string) {
  return res.status(code).json({ error: msg });
}

function firstHeader(h: string | string[] | undefined): string | undefined {
  if (typeof h === "string") return h;
  if (Array.isArray(h)) return h[0];
  return undefined;
}

function parseCookies(header: string | undefined) {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(/; */)) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const k = decodeURIComponent(part.slice(0, eq).trim());
    const v = decodeURIComponent(part.slice(eq + 1).trim());
    out[k] = v;
  }
  return out;
}

/**
 * Try to resolve the authenticated user id from:
 * 1) Authorization: Bearer <JWT> (reads payload, then verifies by DB lookup)
 * 2) x-user-id / x-user-email headers
 * 3) Cookies: uid/userId/user_id or email
 *
 * NOTE: This does NOT verify JWT signatures (no deps). If you want signature
 * verification, add `jose` and we can wire it up.
 */
async function resolveUserIdFromRequest(req: VercelRequest): Promise<string | null> {
  // 1) Authorization: Bearer <jwt>
  const rawAuth =
    firstHeader((req.headers as any)["authorization"]) ??
    firstHeader((req.headers as any)["Authorization"]);
  const bearer = rawAuth && rawAuth.startsWith("Bearer ") ? rawAuth.slice(7).trim() : null;
  if (bearer && bearer.split(".").length === 3) {
    try {
      const payloadJson = Buffer.from(bearer.split(".")[1], "base64url").toString("utf8");
      const payload = JSON.parse(payloadJson) as any;
      const candidateId: string | undefined = payload.sub || payload.userId || payload.uid;
      const candidateEmail: string | undefined = payload.email;
      if (candidateId) {
        const u = await prisma.user.findUnique({ where: { id: candidateId } });
        if (u) return u.id;
      }
      if (candidateEmail) {
        const u = await prisma.user.findUnique({ where: { email: candidateEmail } });
        if (u) return u.id;
      }
    } catch {
      // ignore invalid token shapes
    }
  }

  // 2) Headers
  const headerUserId = firstHeader(req.headers["x-user-id"]);
  if (headerUserId && headerUserId.trim()) {
    const u = await prisma.user.findUnique({ where: { id: headerUserId.trim() } });
    if (u) return u.id;
  }
  const headerUserEmail = firstHeader(req.headers["x-user-email"]);
  if (headerUserEmail && headerUserEmail.trim()) {
    const u = await prisma.user.findUnique({ where: { email: headerUserEmail.trim() } });
    if (u) return u.id;
  }

  // 3) Cookies
  const cookies = parseCookies(firstHeader(req.headers["cookie"]));
  const cookieUserId = cookies.uid || cookies.userId || cookies.user_id;
  if (cookieUserId) {
    const u = await prisma.user.findUnique({ where: { id: cookieUserId } });
    if (u) return u.id;
  }
  const cookieEmail = cookies.email || cookies.user_email;
  if (cookieEmail) {
    const u = await prisma.user.findUnique({ where: { email: cookieEmail } });
    if (u) return u.id;
  }

  return null;
}

// ---------- handler ----------
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return bad(res, 405, "Use POST");
  }

  // parse body
  let body: Body;
  try {
    body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) ?? {};
  } catch {
    return bad(res, 400, "Invalid JSON body");
  }

  const { hotelId, checkIn, checkOut, guests = 1, contactName, contactEmail } = body;

  // validate hotelId
  const hotelIdNum = Number(hotelId);
  if (!hotelId || Number.isNaN(hotelIdNum)) {
    return bad(res, 400, "hotelId must be a number");
  }

  // validate dates
  if (!checkIn || !checkOut) {
    return bad(res, 400, "checkIn and checkOut are required (ISO date strings)");
  }
  const ci = new Date(checkIn);
  const co = new Date(checkOut);
  if (Number.isNaN(+ci) || Number.isNaN(+co) || +co <= +ci) {
    return bad(res, 400, "Invalid date range");
  }

  try {
    // resolve authenticated user
    const userId = await resolveUserIdFromRequest(req);
    if (!userId) {
      return bad(res, 401, "Not authenticated");
    }

    // ensure hotel exists & capacity
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelIdNum },
      select: { id: true, capacity: true, name: true },
    });
    if (!hotel) return bad(res, 404, "Hotel not found");

    const cap = typeof hotel.capacity === "number" ? hotel.capacity : 10;
    if (guests < 1 || guests > cap) {
      return bad(res, 400, `guests must be between 1 and ${cap}`);
    }

    // check for overlapping bookings on same hotel:
    // overlap if (existing.checkIn < co) && (existing.checkOut > ci)
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

    // create booking with the REAL userId
    const booking = await prisma.booking.create({
      data: {
        userId,
        hotelId: hotelIdNum,
        checkIn: ci,
        checkOut: co,
        guests,
        contactName: contactName ?? null,
        contactEmail: contactEmail ?? null,
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
