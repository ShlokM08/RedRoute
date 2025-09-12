// api/hotels/index.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js";

export const config = { runtime: "nodejs" };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Use GET" });
    }

    const rawCity = (Array.isArray(req.query.city) ? req.query.city[0] : req.query.city) ?? "";
    const rawCountry = (Array.isArray(req.query.country) ? req.query.country[0] : req.query.country) ?? "";
    const rawGuests = (Array.isArray(req.query.guests) ? req.query.guests[0] : req.query.guests) ?? "";

    const city = String(rawCity).trim();
    const country = String(rawCountry).trim();
    const guests = Number(rawGuests);

    const AND: any[] = [];

    if (city) {
      AND.push({ city: { equals: city, mode: "insensitive" } });
    }
    if (country) {
      AND.push({ country: { equals: country, mode: "insensitive" } });
    }
    if (!Number.isNaN(guests) && guests > 0) {
      AND.push({ capacity: { gte: guests } });
    }

    const where = AND.length ? { AND } : undefined;

    const hotels = await prisma.hotel.findMany({
      where,
      include: { images: true },
      orderBy: [{ rating: "desc" }, { price: "asc" }],
      take: 24,
    });

    return res.status(200).json(hotels);
  } catch (e: any) {
    console.error("GET /api/hotels error:", e);
    return res.status(500).json({ error: "Server error" });
  }
}
