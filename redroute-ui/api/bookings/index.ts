// api/bookings/index.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const {
      hotelId,
      checkIn,
      checkOut,
      guests,
      contactName,
      contactEmail,
    } = (req.body ?? {}) as {
      hotelId?: number | string;
      checkIn?: string | null;
      checkOut?: string | null;
      guests?: number | string;
      contactName?: string;
      contactEmail?: string;
    };

    // hotelId must be an int (Hotel.id is Int in your schema)
    const hid = Number(hotelId);
    if (!hid || !Number.isInteger(hid)) {
      return res.status(400).json({ error: "hotelId must be an integer" });
    }

    // dates must exist and checkIn < checkOut
    const ci = checkIn ? new Date(checkIn) : null;
    const co = checkOut ? new Date(checkOut) : null;
    if (!ci || !co || Number.isNaN(+ci) || Number.isNaN(+co) || ci >= co) {
      return res.status(400).json({ error: "Invalid dates" });
    }

    // capacity check
    const hotel = await prisma.hotel.findUnique({
      where: { id: hid },
      select: { capacity: true },
    });
    if (!hotel) return res.status(404).json({ error: "Hotel not found" });

    const g = Math.max(1, Number(guests) || 1);
    if (g > hotel.capacity) {
      return res
        .status(400)
        .json({ error: `Guests exceed capacity (${hotel.capacity})` });
    }

    // Figure out who the user is:
    // - if you send "x-user-id" from your API auth, that user is used
    // - otherwise we upsert a "demo" user (safe for dev)
    const headerUserId =
      (req.headers["x-user-id"] as string | undefined) ??
      (req.headers["x-userid"] as string | undefined);

    let userId: string | null = null;

    if (headerUserId) {
      const u = await prisma.user.findUnique({ where: { id: headerUserId } });
      userId = u?.id ?? null;
    }

    if (!userId) {
      const demo = await prisma.user.upsert({
        where: { email: "demo@redroute.app" },
        update: {},
        create: {
          email: "demo@redroute.app",
          passwordHash: "x",
          firstName: "Demo",
          lastName: "User",
        },
      });
      userId = demo.id;
    }

    const booking = await prisma.booking.create({
      data: {
        userId: userId!,
        hotelId: hid,
        checkIn: ci,
        checkOut: co,
        guests: g,
        contactName: contactName || null,
        contactEmail: contactEmail || null,
      },
      select: { id: true },
    });

    return res.status(201).json({ id: booking.id });
  } catch (err) {
    console.error("[/api/bookings] error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
