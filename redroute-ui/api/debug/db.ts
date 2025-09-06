import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const hotelCount = await prisma.hotel.count();
    const imageCount = await prisma.hotelImage.count();
    const bookingCount = await prisma.booking.count();
    const favoriteCount = await prisma.favorite.count();

    // quick sanity: list public tables
    const tables = await prisma.$queryRaw<
      { table_name: string }[]
    >`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1`;

    return res.status(200).json({
      ok: true,
      counts: { hotelCount, imageCount, bookingCount, favoriteCount },
      tables: tables.map(t => t.table_name),
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
}
