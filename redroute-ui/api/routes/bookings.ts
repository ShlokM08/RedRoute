import type { Request, Response } from "express";
import { Router } from "express";
import prisma from "../_lib/prisma.js";

const router = Router();

/**
 * POST /api/bookings
 * body: { hotelId:number, checkIn:string(ISO), checkOut:string(ISO), guests:number, contactName?:string, contactEmail?:string }
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    // If you have an auth middleware, you'll have req.user.id already.
    // For demo: read from a cookie or header; fallback to guest error.
    const userId: string | undefined =
      (req as any)?.user?.id ??
      req.headers["x-user-id"]?.toString();

    if (!userId) {
      return res.status(401).json({ error: "Not signed in" });
    }

    const { hotelId, checkIn, checkOut, guests, contactName, contactEmail } =
      req.body ?? {};

    // Basic validation
    if (!hotelId || !checkIn || !checkOut || !guests) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const inDate  = new Date(checkIn);
    const outDate = new Date(checkOut);
    if (isNaN(+inDate) || isNaN(+outDate) || outDate <= inDate) {
      return res.status(400).json({ error: "Invalid date range" });
    }
    if (guests < 1 || guests > 10) {
      return res.status(400).json({ error: "Invalid guests" });
    }

    // Ensure hotel exists and capacity is enough
    const hotel = await prisma.hotel.findUnique({
      where: { id: Number(hotelId) },
      select: { id: true, capacity: true, name: true },
    });
    if (!hotel) {
      return res.status(404).json({ error: "Hotel not found" });
    }
    if (guests > (hotel.capacity ?? 2)) {
      return res.status(400).json({
        error: `This property can host up to ${hotel.capacity} guests.`,
      });
    }

    // (Optional) You could check overlap here if you store inventory/blocks.

    const booking = await prisma.booking.create({
      data: {
        userId,
        hotelId: hotel.id,
        checkIn: inDate,
        checkOut: outDate,
        guests,
        contactName: contactName || null,
        contactEmail: contactEmail || null,
      },
      select: { id: true },
    });

    return res.status(201).json({ id: booking.id });
  } catch (e: any) {
    console.error("Create booking failed", e);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
