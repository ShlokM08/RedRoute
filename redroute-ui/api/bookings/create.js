import { prisma } from "../_lib/prisma.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).end();

    const { userId, hotelId, startDate, endDate, guests = 2 } = req.body || {};
    if (!userId || !hotelId || !startDate || !endDate) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const booking = await prisma.booking.create({
      data: {
        userId,
        hotelId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        guests
      }
    });
    res.status(201).json(booking);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}
