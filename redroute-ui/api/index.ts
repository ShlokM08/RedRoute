// /api/index.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "./_lib/prisma.js"; // NOTE the .js extension for NodeNext resolution

// -- helpers ---------------------------------------------------------------
function pathOf(req: VercelRequest) {
  const raw = req.url || "/";
  const qIdx = raw.indexOf("?");
  return qIdx >= 0 ? raw.slice(0, qIdx) : raw;
}

function json(res: VercelResponse, status: number, data: any) {
  return res.status(status).setHeader("content-type", "application/json").send(JSON.stringify(data));
}

async function getJsonBody<T = any>(req: VercelRequest): Promise<T> {
  // Vercel usually parses JSON already, but be defensive
  const b: any = (req as any).body;
  if (b && typeof b === "object") return b as T;
  if (typeof b === "string" && b.trim()) {
    try { return JSON.parse(b) as T; } catch { /* fallthrough */ }
  }
  // try reading from buffer if available
  return {} as T;
}

// -- handler ---------------------------------------------------------------
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const p = pathOf(req);

    // ---------------------------------------------------------------------
    // GET /api/hotels?city=...
    // ---------------------------------------------------------------------
    if (req.method === "GET" && p === "/api/hotels") {
      const city = (req.query?.city ?? "").toString().trim();
      const where = city ? { city: { contains: city, mode: "insensitive" as const } } : {};
      const hotels = await prisma.hotel.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          images: true,
        },
      });
      return json(res, 200, hotels);
    }

    // ---------------------------------------------------------------------
    // GET /api/hotels/:id
    // ---------------------------------------------------------------------
    if (req.method === "GET" && p.startsWith("/api/hotels/")) {
      const idStr = p.split("/").pop()!;
      const id = Number(idStr);
      if (!Number.isFinite(id)) return json(res, 400, { error: "Invalid hotel id" });

      const hotel = await prisma.hotel.findUnique({
        where: { id },
        include: { images: true },
      });
      if (!hotel) return json(res, 404, { error: "Hotel not found" });
      return json(res, 200, hotel);
    }

    // ---------------------------------------------------------------------
    // POST /api/bookings
    // Body: { hotelId:number, checkIn:string, checkOut:string, guests:number,
    //         contactName?:string, contactEmail?:string }
    // Validates capacity. Uses logged-in user if available in header/cookie,
    // otherwise upserts a demo user.
    // ---------------------------------------------------------------------
    if (req.method === "POST" && p === "/api/bookings") {
      const body = await getJsonBody<{
        hotelId?: number;
        checkIn?: string;
        checkOut?: string;
        guests?: number;
        contactName?: string;
        contactEmail?: string;
      }>(req);

      const hotelId = Number(body.hotelId);
      const guests = Number(body.guests ?? 1);
      const ci = body.checkIn ? new Date(body.checkIn) : null;
      const co = body.checkOut ? new Date(body.checkOut) : null;

      if (!Number.isFinite(hotelId)) return json(res, 400, { error: "hotelId is required (number)" });
      if (!ci || !co || isNaN(+ci) || isNaN(+co) || +co <= +ci) {
        return json(res, 400, { error: "Invalid check-in/check-out" });
      }

      const hotel = await prisma.hotel.findUnique({
        where: { id: hotelId },
        select: { capacity: true },
      });
      if (!hotel) return json(res, 404, { error: "Hotel not found" });

      const maxCap = hotel.capacity ?? 2;
      if (guests < 1 || guests > maxCap) {
        return json(res, 400, { error: `Guests must be between 1 and ${maxCap}` });
      }

      // Try to get userId from a header you control (adjust this to your auth)
      let userId = (req.headers["x-user-id"] as string | undefined)?.trim();

      // Fallback: upsert a demo user for now (so booking succeeds without auth)
      if (!userId) {
        const demo = await prisma.user.upsert({
          where: { email: "demo@redroute.local" },
          update: {},
          create: {
            email: "demo@redroute.local",
            passwordHash: "demo",     // dummy (you won’t log in with this)
            firstName: "Demo",
            lastName: "User",
          },
        });
        userId = demo.id;
      }

      const booking = await prisma.booking.create({
        data: {
          userId,              // string (matches your schema)
          hotelId,             // int
          checkIn: ci,
          checkOut: co,
          guests,
          contactName: body.contactName || null,
          contactEmail: body.contactEmail || null,
        },
      });

      return json(res, 201, { ok: true, bookingId: booking.id });
    }

    // Fallback
    return json(res, 404, { error: "Not found" });
  } catch (err: any) {
    console.error(err);
    return json(res, 500, { error: "Server error" });
  }
}
