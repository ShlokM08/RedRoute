import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js";

// Read JSON body safely (Vercel sometimes doesn't parse body in all cases)
async function readJson<T = any>(req: VercelRequest): Promise<T | null> {
  if (req.body && typeof req.body === "object") return req.body as T;
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  try {
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

    const hotelIdNum = Number(hotelId);
    if (!Number.isFinite(hotelIdNum)) {
      return res.status(400).json({ error: "hotelId must be a number" });
    }

    const g = Number(guests ?? 1);
    if (!Number.isFinite(g) || g < 1) {
      return res.status(400).json({ error: "guests must be >= 1" });
    }

    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    if (!checkIn || !checkOut || isNaN(ci.getTime()) || isNaN(co.getTime()) || ci >= co) {
      return res.status(400).json({ error: "Invalid check-in / check-out" });
    }

    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelIdNum },
      select: { capacity: true },
    });
    if (!hotel) return res.status(404).json({ error: "Hotel not found" });
    if (g > (hotel.capacity ?? 2)) {
      return res.status(400).json({ error: `Capacity exceeded: max ${hotel.capacity}` });
    }

    // If userId missing, upsert a demo user
    let uid: string = userId;
    if (!uid) {
      const demo = await prisma.user.upsert({
        where: { email: "demo@redroute.local" },
        update: {},
        create: {
          email: "demo@redroute.local",
          passwordHash: "demo",
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

    return res.status(201).json({ ok: true, bookingId: booking.id });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}
