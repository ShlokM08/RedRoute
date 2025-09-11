import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js'; // IMPORTANT: reuse the shared client

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    // Fetch hotels without a join first (keep it simple)
    const hotels = await prisma.hotel.findMany({
      select: { id: true, name: true, city: true, price: true, rating: true },
      orderBy: [{ id: 'desc' }],
      take: 12,
    });

    // Attach images with a second query to avoid a complex join
    const ids = hotels.map(h => h.id);
    const images = ids.length
      ? await prisma.hotelImage.findMany({
          where: { hotelId: { in: ids } },
          select: { id: true, hotelId: true, url: true, alt: true },
        })
      : [];

    const byHotel = new Map<string, Array<{ id: string; hotelId: string; url: string; alt: string | null }>>();
    for (const img of images) {
      if (!byHotel.has(img.hotelId)) byHotel.set(img.hotelId, []);
      byHotel.get(img.hotelId)!.push(img);
    }

    const payload = hotels.map(h => ({ ...h, images: byHotel.get(h.id) ?? [] }));

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(payload);
  } catch (e: any) {
    // Include a little extra info for debugging
    return res.status(500).json({
      error: e?.message || 'Failed to load hotels',
      code: e?.code,
      meta: e?.meta,
    });
  }
}
