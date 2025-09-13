import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "./_lib/prisma.js"; // NOTE the .js extension for node16/nodenext

/* ------------------------------- helpers ---------------------------------- */
function send(res: VercelResponse, code: number, data: any) {
  res.status(code).json(data);
}

function notFound(res: VercelResponse) {
  return send(res, 404, { error: "Not found" });
}

async function readJson<T = any>(req: VercelRequest): Promise<T | null> {
  try {
    const chunks: Uint8Array[] = [];
    await new Promise<void>((resolve, reject) => {
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => resolve());
      req.on("error", (e) => reject(e));
    });
    const raw = Buffer.concat(chunks).toString("utf8") || "{}";
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/* ------------------------------- handler ---------------------------------- */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS (simple)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    const url = new URL(req.url || "", `https://${req.headers.host}`);
    const path = url.pathname; // e.g. /api/hotels, /api/hotels/12, /api/bookings

    /* --------------------------- GET /api/hotels --------------------------- */
    if (req.method === "GET" && path === "/api/hotels") {
      const city = (url.searchParams.get("city") || "").trim();
      const where = city
        ? { city: { contains: city, mode: "insensitive" as const } }
        : {};
      const hotels = await prisma.hotel.findMany({
        where,
        include: { images: true },
        orderBy: { id: "asc" },
      });
      return send(res, 200, hotels);
    }

    /* ------------------------- GET /api/hotels/:id ------------------------ */
    if (req.method === "GET" && /^\/api\/hotels\/\d+$/.test(path)) {
      const idStr = path.split("/").pop()!;
      const idNum = Number(idStr);
      if (!Number.isFinite(idNum)) return notFound(res);

      const hotel = await prisma.hotel.findUnique({
        where: { id: idNum },
        include: { images: true },
      });
      if (!hotel) return notFound(res);
      return send(res, 200, hotel);
    }

    /* --------------------------- POST /api/bookings ----------------------- */
    if (req.method === "POST" && path === "/api/bookings") {
      const body = (await readJson<any>(req)) ?? {};
      const {
        hotelId,
        checkIn,
        checkOut,
        guests,
        contactName,
        contactEmail,
        userId,
      } = body;

      // Basic validation
      const hotelIdNum = Number(hotelId);
      if (!Number.isFinite(hotelIdNum)) {
        return send(res, 400, { error: "hotelId must be a number" });
      }
      const g = Number(guests ?? 1);
      if (!Number.isFinite(g) || g < 1) {
        return send(res, 400, { error: "guests must be >= 1" });
      }
      const ci = new Date(checkIn);
      const co = new Date(checkOut);
      if (!checkIn || !checkOut || isNaN(ci.getTime()) || isNaN(co.getTime()) || ci >= co) {
        return send(res, 400, { error: "Invalid check-in / check-out" });
      }

      // Capacity check
      const hotel = await prisma.hotel.findUnique({
        where: { id: hotelIdNum },
        select: { capacity: true },
      });
      if (!hotel) return send(res, 404, { error: "Hotel not found" });
      if (g > (hotel.capacity ?? 2)) {
        return send(res, 400, {
          error: `Capacity exceeded: hotel allows up to ${hotel.capacity}`,
        });
      }

      // User: if not provided, upsert a demo user
      let uid = (userId as string | undefined) || "";
      if (!uid) {
        const demo = await prisma.user.upsert({
          where: { email: "demo@redroute.local" },
          update: {},
          create: {
            email: "demo@redroute.local",
            passwordHash: "demo", // harmless placeholder; you can ignore it
            firstName: "Demo",
            lastName: "User",
          },
        });
        uid = demo.id;
      }

      const booking = await prisma.booking.create({
        data: {
          userId: uid,
          hotelId: hotelIdNum,
          checkIn: ci,
          checkOut: co,
          guests: g,
          contactName: contactName || null,
          contactEmail: contactEmail || null,
        },
      });

      return send(res, 201, { ok: true, bookingId: booking.id });
    }

    // Fallback for unknown routes under /api
    return notFound(res);
  } catch (err: any) {
    console.error(err);
    return send(res, 500, { error: "Server error" });
  }
}
