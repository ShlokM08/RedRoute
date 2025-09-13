import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js";

type Body = {
  hotelId?: number;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  contactName?: string;
  contactEmail?: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    // Vercel usually parses JSON already:
    const body = (req.body || {}) as Body;

    const hotelId = Number(body.hotelId);
    const guests = Number(body.guests ?? 1);
    const checkIn = body.checkIn ? new Date(body.checkIn) : null;
    const checkOut = body.checkOut ? new Date(body.checkOut) : null;

    if (!Number.isFinite(hotelId)) return res.status(400).json({ error: "hotelId is required (number)" });
    if (!checkIn || !checkOut || isNaN(+checkIn) || isNaN(+checkOut) || +checkOut <= +checkIn) {
      return res.status(400).json({ error: "Invalid check-in/check-out" });
    }

    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { capacity: true },
    });
    if (!hotel) return res.status(404).json({ error: "Hotel not found" });

    const cap = hotel.capacity ?? 2;
    if (guests < 1 || guests > cap) {
      return res.status(400).json({ error: `Guests must be between 1 and ${cap}` });
    }

    // Use logged-in user if you pass it via header/cookie. For now: demo fallback.
    let userId = (req.headers["x-user-id"] as string | undefined)?.trim();
    if (!userId) {
      const demo = await prisma.user.upsert({
        where: { email: "demo@redroute.local" },
        update: {},
        create: {
          email: "demo@redroute.local",
          passwordHash: "demo",   // placeholder
          firstName: "Demo",
          lastName: "User",
        },
      });
      userId = demo.id;
    }

    const booking = await prisma.booking.create({
      data: {
        userId,               // string (your schema)
        hotelId,              // int
        checkIn,
        checkOut,
        guests,
        contactName: body.contactName || null,
        contactEmail: body.contactEmail || null,
      },
    });

    return res.status(201).json({ ok: true, bookingId: booking.id });
  } catch (e: any) {
    console.error("POST /api/bookings error:", e);
    return res.status(500).json({ error: "Server error" });
  }
}
