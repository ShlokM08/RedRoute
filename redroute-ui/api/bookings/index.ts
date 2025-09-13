import type { VercelRequest, VercelResponse } from "@vercel/node";
// IMPORTANT for NodeNext/Node16: import with .js
import prisma from "../_lib/prisma.js";

/**
 * POST /api/bookings
 * Body: { hotelId: number|string, checkIn: string(yyyy-mm-dd), checkOut: string(yyyy-mm-dd), guests: number,
 *         contactName?: string, contactEmail?: string }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    // Body may be parsed by Vercel; still guard
    const body = (req.body ?? {}) as Record<string, any>;

    const hotelId = Number(body.hotelId);
    const checkInStr = String(body.checkIn || "");
    const checkOutStr = String(body.checkOut || "");
    const guests = Number(body.guests ?? 1);
    const contactName = body.contactName ? String(body.contactName) : undefined;
    const contactEmail = body.contactEmail ? String(body.contactEmail) : undefined;

    if (!Number.isFinite(hotelId) || hotelId <= 0) {
      return res.status(400).json({ error: "Invalid hotelId" });
    }

    // Parse dates as local yyyy-mm-dd → Date at local midnight
    const ci = new Date(checkInStr);
    const co = new Date(checkOutStr);
    if (!Number.isFinite(+ci) || !Number.isFinite(+co) || +co <= +ci) {
      return res.status(400).json({ error: "Invalid date range" });
    }

    if (!Number.isFinite(guests) || guests < 1) {
      return res.status(400).json({ error: "Invalid guests count" });
    }

    // Ensure hotel exists and get capacity
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { id: true, capacity: true, name: true },
    });
    if (!hotel) {
      return res.status(404).json({ error: "Hotel not found" });
    }
    const cap = typeof hotel.capacity === "number" ? hotel.capacity : 1;
    if (guests > cap) {
      return res
        .status(400)
        .json({ error: `Too many guests. Maximum for this hotel is ${cap}.` });
    }

    // Identify the user.
    // If you already set userId in an auth cookie/header, read it here.
    // Fallback: upsert a demo user so the relation is valid.
    const userEmail =
      (req.headers["x-user-email"] as string | undefined) ||
      "demo@redroute.local";
    const user = await prisma.user.upsert({
      where: { email: userEmail },
      update: {},
      create: {
        email: userEmail,
        passwordHash: "demo", // required field in schema
        firstName: "Demo",
        lastName: "User",
      },
      select: { id: true },
    });

    // Create the booking
    const created = await prisma.booking.create({
      data: {
        userId: user.id,
        hotelId: hotel.id,
        checkIn: ci,
        checkOut: co,
        guests,
        contactName,
        contactEmail,
      },
      select: {
        id: true,
        checkIn: true,
        checkOut: true,
        guests: true,
        hotelId: true,
        userId: true,
        createdAt: true,
      },
    });

    return res.status(201).json({ ok: true, booking: created });
  } catch (e: any) {
    // Surface Prisma/validation details in a safe-ish way
    const msg =
      e?.code && e?.meta
        ? `DB error ${e.code}`
        : e?.message || "Internal error";
    return res.status(500).json({ error: msg });
  }
}
