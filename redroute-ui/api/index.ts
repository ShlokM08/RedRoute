import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "./_lib/prisma.js";

// --- Create Booking ---
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "POST" && req.url?.startsWith("/api/bookings")) {
    try {
      const { hotelId, checkIn, checkOut, guests, contactName, contactEmail } = req.body ?? {};

      if (!hotelId || !checkIn || !checkOut) {
        return res.status(400).json({ error: "hotelId, checkIn and checkOut are required." });
      }

      // Get current userId (replace with your auth/session)
      let userId = req.headers["x-user-id"] as string | undefined;
     const DEMO_EMAIL = "demo@redroute.local";

const demo = await prisma.user.upsert({
  where: { email: DEMO_EMAIL },
  update: {},
  create: {
    email: DEMO_EMAIL,
    // Required by your schema; any string is fine if this user never logs in.
    // (If you prefer, bcrypt-hash something and put the hash here.)
    passwordHash: "demo",
    firstName: "Demo",
    lastName: "User",
  },
});

userId = demo.id;

      const booking = await prisma.booking.create({
        data: {
          hotelId,
          userId,
          checkIn: new Date(checkIn),
          checkOut: new Date(checkOut),
          guests: guests ?? 1,
          contactName: contactName ?? null,
          contactEmail: contactEmail ?? null,
        },
      });

      return res.status(201).json({ booking });
    } catch (e: any) {
      console.error("Booking error", e);
      return res.status(500).json({ error: e?.message || "Server error" });
    }
  }

  // Fallback for other routes
  if (req.method === "GET" && req.url?.startsWith("/api/hotels")) {
    try {
      const { city } = req.query;
      const hotels = await prisma.hotel.findMany({
        where: city ? { city: { contains: String(city), mode: "insensitive" } } : {},
        include: { images: true },
      });
      return res.status(200).json(hotels);
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || "Server error" });
    }
  }

  return res.status(404).json({ error: "Not found" });
}
