// api/bookings/index.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const {
      hotelId,
      checkIn,
      checkOut,
      guests = 1,
      contactName,
      contactEmail,
    } = (req.body ?? {}) as {
      hotelId: number | string;
      checkIn: string;
      checkOut: string;
      guests?: number;
      contactName?: string;
      contactEmail?: string;
    };

    if (!hotelId || !checkIn || !checkOut) {
      return res.status(400).json({ error: "hotelId, checkIn, checkOut are required" });
    }

    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    if (isNaN(+ci) || isNaN(+co) || +co <= +ci) {
      return res.status(400).json({ error: "Invalid dates" });
    }

    const hotel = await prisma.hotel.findUnique({
      where: { id: Number(hotelId) },
      select: { id: true, capacity: true },
    });
    if (!hotel) return res.status(404).json({ error: "Hotel not found" });

    if (typeof guests !== "number" || guests < 1) {
      return res.status(400).json({ error: "guests must be a positive number" });
    }
    if (hotel.capacity != null && guests > hotel.capacity) {
      return res.status(400).json({ error: `Selected hotel allows up to ${hotel.capacity} guests` });
    }

    // TODO: replace with your auth logic
    const userId =
      (req as any).user?.id ||
      process.env.DEMO_USER_ID; // set this for local testing if you want
    if (!userId) return res.status(401).json({ error: "Sign in to book" });

    const booking = await prisma.booking.create({
      data: {
        userId,
        hotelId: hotel.id,
        checkIn: ci,
        checkOut: co,
        guests,
        contactName: contactName ?? null,
        contactEmail: contactEmail ?? null,
      },
      include: {
        hotel: { select: { name: true, city: true } },
      },
    });

    return res.status(201).json(booking);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Could not create booking" });
  }
}
